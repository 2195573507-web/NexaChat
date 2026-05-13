import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/renderer/App';
import { createMockApi } from '../src/renderer/mockApi';
import { navModules } from '../src/shared/navigation';

beforeEach(() => {
  window.nexachat = createMockApi();
});

async function renderApp() {
  render(<App />);
  await screen.findByRole('button', { name: /工作台/ });
}

describe('NexaChat renderer', () => {
  it('renders all eight first-level modules', async () => {
    await renderApp();

    for (const module of navModules) {
      expect(screen.getByRole('button', { name: new RegExp(module.label) })).toBeInTheDocument();
    }
  });

  it('can input and send a chat message through the browser fallback API', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: /对话/ }));
    const input = screen.getByPlaceholderText('输入消息，本地保存后再路由到模型...');
    fireEvent.change(input, { target: { value: '测试本地 fallback 发送' } });
    fireEvent.click(screen.getByRole('button', { name: /发送/ }));

    await waitFor(() => {
      expect(screen.getByText('测试本地 fallback 发送')).toBeInTheDocument();
    });
    expect(screen.getByText(/Mock response from nexachat-mock/)).toBeInTheDocument();
  });

  it('shows model, gateway, and settings key areas', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: /模型/ }));
    expect(screen.getByRole('heading', { name: 'Provider Hub' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Model Hub' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '能力矩阵' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /本地网关/ }));
    expect(screen.getByRole('heading', { name: '本地 OpenAI-compatible 网关' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'API Key' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '外部接入生成器' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /设置与安全/ }));
    expect(screen.getByRole('heading', { name: '请求日志' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '密钥安全' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '界面设置' })).toBeInTheDocument();
  });
});
