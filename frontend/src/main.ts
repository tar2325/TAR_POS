import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeTh from '@angular/common/locales/th';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { isChunkLoadError, triggerChunkReload } from './app/core/handlers/global-error.handler';

// Early window-level safety net for unhandled chunk/script import errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.error || event.message)) {
      triggerChunkReload();
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      triggerChunkReload();
    }
  });
}

registerLocaleData(localeTh);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
