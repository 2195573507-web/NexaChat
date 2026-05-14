import { useEffect, useState } from 'react';
import type { UiPreferences } from '../../shared/types';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel } from './shared';

export function SettingsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const [prefs, setPrefs] = useState<UiPreferences>(snapshot.uiPreferences);
  useEffect(() => setPrefs(snapshot.uiPreferences), [snapshot.uiPreferences]);

  if (activeTab.id === 'security') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>安全存储与 IPC 边界</h2>
            <p>Renderer 只能看到 secret_ref 和 Gateway Key 预览；API Key、Authorization、自定义敏感 Header 在日志和导出中默认脱敏。</p>
            <dl className="detail-list">
              <div><dt>Preload</dt><dd>仅暴露 `window.nexachat` 的白名单 API，不暴露 ipcRenderer。</dd></div>
              <div><dt>Provider Key</dt><dd>保存在主进程 secret_ref，页面不显示明文。</dd></div>
              <div><dt>Gateway Key</dt><dd>完整 Key 仅生成后一次性显示；列表只保留预览。</dd></div>
              <div><dt>日志脱敏</dt><dd>Authorization、API Key 和敏感 Header 默认 redaction。</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>Gateway Key 状态</h2>
            <DataTable
              columns={['Gateway Key', '预览', 'Scopes', 'Revoked']}
              rows={snapshot.gatewayKeys.map((key) => [key.name, key.keyPreview, key.scopes.join(', '), key.revokedAt ? 'yes' : 'no'])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'audit') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <h2>审计日志</h2>
          <DataTable
            columns={['动作', '目标', '详情', '时间']}
            rows={snapshot.auditLogs.map((log) => [log.action, `${log.targetType}:${log.targetId ?? '-'}`, log.detailsJson ?? '-', new Date(log.createdAt).toLocaleString()])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'about') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>版本与运行环境</h2>
            <dl className="detail-list">
              <div><dt>应用版本</dt><dd>0.2 operation logic refactor</dd></div>
              <div><dt>网关端口</dt><dd>{snapshot.dashboard.gatewayStatus.port}</dd></div>
              <div><dt>绑定地址</dt><dd>{snapshot.dashboard.gatewayStatus.bindHost}</dd></div>
              <div><dt>数据位置</dt><dd>Electron userData / SQLite</dd></div>
              <div><dt>桌面入口</dt><dd>由本轮桌面快捷方式检查记录，不在 UI 内提供不可验证修复按钮。</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>环境限制</h2>
            <DataTable
              columns={['能力', '状态', '说明']}
              rows={[
                ['真实上游模型推理', <StateBadge key="provider" label="未开放" tone="warning" />, '当前 sendMessage 走本地持久化和 mock/local response。'],
                ['完整向量 RAG', <StateBadge key="rag" label="环境受限" tone="warning" />, '当前为文本 lexical fallback。'],
                ['MCP / Agent 真执行', <StateBadge key="agent" label="未开放" tone="warning" />, '当前只保存注册、授权和 dry-run。'],
                ['打包安装器', <StateBadge key="installer" label="未配置" tone="muted" />, 'package.json 未配置 electron-builder 或 Forge。'],
              ]}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="settings" tab={activeTab}>
      <section className="panel">
        <h2>界面偏好</h2>
        <div className="form-grid">
          <label>
            Theme
            <select value={prefs.theme} onChange={(event) => setPrefs({ ...prefs, theme: event.target.value as UiPreferences['theme'] })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Density
            <select value={prefs.density} onChange={(event) => setPrefs({ ...prefs, density: event.target.value as UiPreferences['density'] })}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            Font
            <select value={prefs.fontMode} onChange={(event) => setPrefs({ ...prefs, fontMode: event.target.value as UiPreferences['fontMode'] })}>
              <option value="system">System</option>
              <option value="kaiti">KaiTi for message preview</option>
            </select>
          </label>
          <label>
            Language
            <select value={prefs.language} onChange={(event) => setPrefs({ ...prefs, language: event.target.value as UiPreferences['language'] })}>
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <label>
            Motion
            <select value={prefs.reducedMotion ? 'reduced' : 'normal'} onChange={(event) => setPrefs({ ...prefs, reducedMotion: event.target.value === 'reduced' })}>
              <option value="normal">Normal</option>
              <option value="reduced">Reduced</option>
            </select>
          </label>
        </div>
        <button type="button" className="primary-button" onClick={() => onAction('界面偏好已持久化', () => api.saveUiPreferences(prefs))}>
          保存界面偏好
        </button>
      </section>
    </TabPanel>
  );
}
