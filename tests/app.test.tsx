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

function activePanel() {
  return document.querySelector('main [role="tabpanel"]') as HTMLElement;
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
    fireEvent.click(screen.getByRole('tab', { name: /模型列表/ }));
    expect(screen.getByRole('heading', { name: 'Model Hub' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /密钥管理/ }));
    expect(activePanel()).toHaveAttribute('data-tab', 'capabilities');
    expect(activePanel()).toHaveTextContent('密钥管理');

    fireEvent.click(screen.getByRole('button', { name: /本地网关/ }));
    expect(screen.getByRole('heading', { name: '本地 OpenAI-compatible 网关' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /API Key 管理/ }));
    expect(activePanel()).toHaveAttribute('data-tab', 'keys');
    expect(activePanel()).toHaveTextContent('API Key');
    fireEvent.click(screen.getByRole('tab', { name: /CCS\/sub2api 导入/ }));
    expect(screen.getByRole('heading', { name: '导入配置预览' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /设置与安全/ }));
    expect(activePanel()).toHaveAttribute('data-tab', 'request-logs');
    expect(activePanel()).toHaveTextContent('运行监控');
    fireEvent.click(screen.getByRole('tab', { name: /安全中心/ }));
    expect(activePanel()).toHaveAttribute('data-tab', 'keys');
    expect(activePanel()).toHaveTextContent('安全中心');
    fireEvent.click(screen.getByRole('tab', { name: /系统设置/ }));
    expect(activePanel()).toHaveAttribute('data-tab', 'ui');
    expect(activePanel()).toHaveTextContent('系统设置');
  });
});
