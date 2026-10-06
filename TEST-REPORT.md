# 4.0 验证说明

已验收的4.0功能未改。本次准备公开资料只更新README、发行说明和随附文档/截图；26个数据分片与已验收版逐字节一致。

查词测试8项通过；隔离Chrome for Testing145/Playwright Core1.58.2的16项浏览器流程/隐私检查与1项真实Academy页面检查通过，共17项。ChatGPT Learn无可悬停公开文本，记录未验证。日常Mac Chrome显示4.0，当前页启用和Courses悬停已实际验证，使用者确认可用。公开截图来自隔离未登录页面/本地测试页面，没有账号或私人标签。

复现：npm test；python3 scripts/build_data.py；python3 scripts/package.py。浏览器验证：npm run test:browser，需要playwright-core1.58.2与兼容Chromium。隔离测试副本临时增加本地fixture和目标公开页面网站权限，生产仅activeTab/scripting，工具栏实际授予已在日常Chrome确认。

固定上游文件、哈希与分片数在extension/data/metadata.json，许可在extension/licenses。公开准备产物的最终检查记录置于本地review，包含ZIP解包一致性、数据和功能文件与已验收版比较、私密信息扫描及本地文档链接检查。不会将日常浏览器截图、个人安装路径或旧版本放进公开资料。
