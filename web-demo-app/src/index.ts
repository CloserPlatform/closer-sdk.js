import * as $ from 'jquery';
import { displayVersion } from './version';
import { AppModule } from './app/app.module';
import 'jquery-ui-bundle';

const appModule = new AppModule();

$(() => {
  displayVersion();
  appModule.init();
});
