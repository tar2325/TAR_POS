import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeTh from '@angular/common/locales/th';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeTh);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
