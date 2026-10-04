# Jane-Rui/SimAdmin 同步与 OTA 发布

更新日期：2026-10-04

## 入口与边界

- 定时同步/发布：`.github/workflows/sync-and-release.yml`（每日 UTC20:00；GitHub 可能延迟）。
- 手动 OTA 构建：`.github/workflows/build-ota-package.yml`。
- 打包脚本：`scripts/build/pack-ota.sh`，不能再调用旧的 `scripts/pack-ota.sh`。
- 标准包只包含 `meta.json`、`simadmin`、`www/`；Agent 作为 Rust library 编译进主二进制，不是另外一个需要打包的程序。Hub/lpac 不属于本次标准 OTA 包。

同步保留完整本地工作流目录，包括删除上游新加入的 workflow 文件；仅对已知的 `backend/src/ota.rs` 冲突采用上游并恢复自己的发布源，其他冲突停止。无论是否发生冲突，提交前都校验 OTA 源仍指向 `Jane-Rui/SimAdmin/releases/latest`。合并故障不会被笼统忽略后继续发布。

## 失败恢复与同版本判断

此前只根据 VERSION 是否变化判断发版，导致一次“同步成功、构建失败”后下一次变成绿色跳过。现在每次同步后都查询当前版本的 Release：

- 没有 Release：需要构建；即使上次已经同步源码也会重试。
- 完整正式 Release（两份非空架构资产）：定时任务跳过重复构建；手动任务仍能构建验证，但不会覆盖现有 Release。
- 已存在但缺资产、draft 或 prerelease：明确失败，要求审核，不自动覆盖已发布内容。
- GitHub API 查询失败：任务失败，不把网络/权限问题误报为“没有 Release”。

同步结果输出准确的 commit SHA，两个架构 checkout 同一 SHA，Release 标签也指定该 SHA，防止 main 在构建过程中移动造成版本混用。任务采用串行并发组；旧 Release 和既有资产不覆盖。

## 构建与验收

ARM64 在 ubuntu-24.04-arm、x86_64 在 ubuntu-latest 原生 runner 上构建 musl 目标，保留 musl-tools、显式 C 编译器/linker 和 bundled SQLite 设置。构建前端后调用官方脚本，并校验包中的版本、架构、standard edition、ELF machine、二进制 MD5 和前端 MD5。

成功必须是 sync + 两个 build + publish 全部执行且成功；不能以“下一次绿色但 build/publish skipped”证明修复。发布后下载正式资产并核对 CI SHA256、GitHub digest、meta commit、实际 ELF 架构/动态依赖和安装器包结构校验。

本次真实 run37173022210 已完成 v1.2.2 双架构构建发布；标签绑定 d1c35e9fd224f57e2e16140446387179c7b77da1。标准包命名保持 `simadmin-aarch64.tar.gz` 和 `simadmin-x86_64.tar.gz`，兼容现有 OTA 选择逻辑。

## 安全与回滚

本次只修改 GitHub 工作流，不更新或重启已安装设备、不改数据库和蜂窝配置。发布 Release 不等于设备已升级。手动构建使用自动 VERSION 最稳妥；自定义不同版本还涉及 Cargo.lock 同步，不能只改 Cargo.toml 后期待 --locked 通过。

维护变更可回退到修复前 main d0a40a603b59a54c9bdff14ff0c87a4ecf789982。不要删除/改写已被客户端使用的旧 Release。仓库凭据只能来自 GitHub Secret 或环境变量；不能写入脚本、配置、日志或归档包。
