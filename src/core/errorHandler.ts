/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger';

export class ErrorHandler {
  private static MAX_LOGS = 200;
  private static logs: string[] = [];

  public static init() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError('Global Error', { message, source, lineno, colno, error });
    };
    window.onunhandledrejection = (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason);
    };
  }

  private static handleError(type: string, details: any) {
    const errorMsg = `${type}: ${JSON.stringify(details)}`;
    this.logs.push(errorMsg);
    if (this.logs.length > this.MAX_LOGS) this.logs.shift();
    logger.error(errorMsg);
    this.showErrorUI(errorMsg);
  }

  private static showErrorUI(message: string) {
    const container = document.createElement('div');
    container.id = 'error-screen';
    container.className = 'font-pixel';
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0',
      backgroundColor: '#1a1c2c',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f4f4f4',
      padding: '40px',
      textAlign: 'center',
      border: '8px solid #333c57',
    });

    container.innerHTML = `
      <div style="font-size: 32px; color: #ff004d; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px;">Error de Red de Almas</div>
      <div style="background: #10121c; padding: 20px; border: 4px solid #333c57; width: 100%; max-width: 600px; margin-bottom: 32px; overflow-y: auto; max-height: 300px;">
        <p style="color: #94b3c1; font-size: 14px; text-align: left; white-space: pre-wrap;">${message}</p>
      </div>
      <div style="display: flex; gap: 16px;">
        <button id="retryBtn" style="background: #5fcd19; border: 4px solid #30340f; color: white; padding: 12px 24px; cursor: pointer; text-transform: uppercase;">Reiniciar Juego</button>
        <button id="copyBtn" style="background: #333c57; border: 4px solid #10121c; color: white; padding: 12px 24px; cursor: pointer; text-transform: uppercase;">Copiar Error</button>
      </div>
    `;

    document.body.appendChild(container);
    document.getElementById('retryBtn')?.addEventListener('click', () => location.reload());
    document.getElementById('copyBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(message);
      const btn = document.getElementById('copyBtn');
      if (btn) btn.innerText = 'Copiado!';
    });
  }
}
