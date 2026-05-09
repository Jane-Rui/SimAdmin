//! SMS Listener Module (ModemManager 版)
//!
//! 通过 D-Bus 信号监听 ModemManager 的短信接收事件，并增加轮询兜底，
//! 以便在部分 eSIM/国际运营商场景下尽量减少漏收。
use crate::db::{Database, SmsMessage};
use crate::modem_manager::find_modem_path;
use crate::notification::NotificationSender;
use futures_util::StreamExt;
use std::sync::Arc;
use tokio::time::Duration;
use tracing::{info, warn};
use zbus::zvariant::OwnedValue;
use zbus::{Connection, MessageStream, Proxy};

/// ModemManager 常量
const MM_SERVICE: &str = "org.freedesktop.ModemManager1";
const MM_MESSAGING: &str = "org.freedesktop.ModemManager1.Modem.Messaging";
const MM_SMS: &str = "org.freedesktop.ModemManager1.Sms";
const DBUS_PROPERTIES: &str = "org.freedesktop.DBus.Properties";
const MM_SMS_STATE_RECEIVED: u32 = 3;
const SMS_DELETE_DELAY_SECS: u64 = 5;
const MODEM_RETRY_DELAY_SECS: u64 = 5;

#[derive(Debug)]
struct IncomingSms {
    path: String,
    number: String,
    content: String,
}

fn decode_sms_data(value: &OwnedValue) -> Option<String> {
    let bytes = Vec::<u8>::try_from(value.clone()).ok()?;
    if bytes.is_empty() {
        return None;
    }
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

fn sms_marker(sms_path: &str) -> String {
    format!("mm:{sms_path}")
}

/// 从 SMS 对象路径读取短信内容
async fn read_sms_content(conn: &Connection, sms_path: &str) -> Option<IncomingSms> {
    let proxy = Proxy::new(conn, MM_SERVICE, sms_path, DBUS_PROPERTIES)
        .await
        .ok()?;

    let props: std::collections::HashMap<String, OwnedValue> =
        proxy.call("GetAll", &(MM_SMS,)).await.ok()?;

    let number = props
        .get("Number")
        .and_then(|v| String::try_from(v.clone()).ok())
        .unwrap_or_else(|| "Unknown".to_string());

    let text = props
        .get("Text")
        .and_then(|v| String::try_from(v.clone()).ok())
        .unwrap_or_default();
    let data = props.get("Data").and_then(decode_sms_data);

    let state = props
        .get("State")
        .and_then(|v| u32::try_from(v.clone()).ok())
        .unwrap_or(0);

    if state != MM_SMS_STATE_RECEIVED {
        return None;
    }

    let content = if text.is_empty() {
        data.unwrap_or_default()
    } else {
        text
    };

    Some(IncomingSms {
        path: sms_path.to_string(),
        number,
        content,
    })
}

async fn process_sms_path(
    conn: &Connection,
    db: &Database,
    notification_sender: &Arc<NotificationSender>,
    modem_path: &str,
    sms_path: &str,
) {
    let marker = sms_marker(sms_path);
    match db.sms_exists_by_pdu(&marker) {
        Ok(true) => return,
        Ok(false) => {}
        Err(e) => {
            warn!(error = %e, marker = %marker, "Failed to check SMS dedupe marker");
            return;
        }
    }

    let Some(incoming) = read_sms_content(conn, sms_path).await else {
        return;
    };

    info!(
        path = %incoming.path,
        from = %incoming.number,
        len = incoming.content.len(),
        "SMS content read"
    );

    match db.insert_sms(
        "incoming",
        &incoming.number,
        &incoming.content,
        "received",
        Some(&marker),
    ) {
        Ok(id) => {
            let sms = SmsMessage {
                id,
                direction: "incoming".to_string(),
                phone_number: incoming.number,
                content: incoming.content,
                timestamp: chrono::Utc::now().to_rfc3339(),
                status: "received".to_string(),
                pdu: Some(marker),
            };
            let notification_sender = Arc::clone(notification_sender);
            tokio::spawn(async move {
                let _ = notification_sender.forward_sms(&sms).await;
            });

            let conn_clone = conn.clone();
            let modem_path = modem_path.to_string();
            let sms_path = incoming.path;
            tokio::spawn(async move {
                tokio::time::sleep(Duration::from_secs(SMS_DELETE_DELAY_SECS)).await;
                let proxy =
                    Proxy::new(&conn_clone, MM_SERVICE, modem_path.as_str(), MM_MESSAGING).await;
                match proxy {
                    Ok(proxy) => {
                        let sms_path_obj = zbus::zvariant::ObjectPath::try_from(sms_path.as_str());
                        match sms_path_obj {
                            Ok(path) => {
                                if let Err(e) = proxy.call::<_, _, ()>("Delete", &(path,)).await {
                                    warn!(error = %e, path = %sms_path, "Failed to delete processed SMS from ModemManager");
                                }
                            }
                            Err(e) => {
                                warn!(error = %e, path = %sms_path, "Invalid SMS path for deletion");
                            }
                        }
                    }
                    Err(e) => {
                        warn!(error = %e, path = %sms_path, "Failed to create Messaging proxy for SMS deletion");
                    }
                }
            });
        }
        Err(e) => {
            warn!(error = %e, path = %incoming.path, "Failed to store incoming SMS");
        }
    }
}

/// Start SMS listener (ModemManager 版)
///
/// 监听 ModemManager 的 Messaging.Added 信号。
pub async fn start_sms_listener(
    conn: Connection,
    db: Arc<Database>,
    notification_sender: Arc<NotificationSender>,
) -> zbus::Result<()> {
    info!("Starting SMS listener (ModemManager mode)");
    loop {
        let modem_path = loop {
            match find_modem_path(&conn).await {
                Ok(path) => break path,
                Err(e) => {
                    warn!(
                        error = %e,
                        retry_after_secs = MODEM_RETRY_DELAY_SECS,
                        "SMS listener waiting for modem"
                    );
                    tokio::time::sleep(Duration::from_secs(MODEM_RETRY_DELAY_SECS)).await;
                }
            }
        };

        let dbus_proxy = Proxy::new(
            &conn,
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus",
        )
        .await?;

        let rule = format!(
            "type='signal',sender='{}',interface='{}',member='Added',path='{}'",
            MM_SERVICE, MM_MESSAGING, modem_path
        );
        dbus_proxy
            .call::<_, _, ()>("AddMatch", &(rule.as_str(),))
            .await?;

        info!(modem_path = %modem_path, "SMS listener registered, waiting for messages...");

        let mut stream = MessageStream::from(&conn);

        loop {
            let msg = match stream.next().await {
                Some(Ok(msg)) => msg,
                Some(Err(e)) => {
                    warn!(error = %e, "SMS listener stream error");
                    break;
                }
                None => break,
            };

            if let Some(member) = msg.header().member() {
                if member.as_str() == "Added" {
                    if let Ok((sms_path, received)) = msg
                        .body()
                        .deserialize::<(zbus::zvariant::ObjectPath, bool)>()
                    {
                        if !received {
                            continue;
                        }

                        let sms_path_str = sms_path.to_string();
                        info!(path = %sms_path_str, "New SMS received");

                        // Give ModemManager a short moment to assemble multipart SMS content.
                        tokio::time::sleep(Duration::from_millis(500)).await;
                        process_sms_path(
                            &conn,
                            &db,
                            &notification_sender,
                            modem_path.as_str(),
                            &sms_path_str,
                        )
                        .await;
                    }
                }
            }
        }

        warn!(
            retry_after_secs = MODEM_RETRY_DELAY_SECS,
            "SMS listener stream ended, re-registering after delay"
        );
        tokio::time::sleep(Duration::from_secs(MODEM_RETRY_DELAY_SECS)).await;
    }
}
