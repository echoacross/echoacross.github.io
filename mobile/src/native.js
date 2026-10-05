import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {LocalNotifications} from '@capacitor/local-notifications';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {createReminders} from './reminders.js';
if(Capacitor.isNativePlatform()) {
  const api=window.EchoApp;
  const reminders=createReminders({plugin:LocalNotifications,owner:api.owner,storage:localStorage});
  function showSettings(){
    const dialog=document.createElement('dialog');dialog.className='viewsDialog';
    dialog.innerHTML='<div class="viewsDialogBody"><h2>Минута для себя</h2><p>Одно напоминание в день. Без личных записей на экране блокировки.</p><label>Время <input id="nativeTime" type="time" value="20:00"></label><button class="cta selfPrimary" id="nativeEnable">Включить</button><button class="quietTextButton" id="nativeDisable">Выключить</button><p id="nativeStatus" role="status"></p><button class="quietTextButton" id="nativeClose">Закрыть</button></div>';
    const pref=reminders.read(api.owner());if(pref?.time)dialog.querySelector('input').value=pref.time;
    const status=dialog.querySelector('#nativeStatus');status.textContent=pref?.enabled?'Напоминание включено.':'Напоминание выключено.';
    const act=async action=>{const buttons=[...dialog.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await action();status.textContent='Готово.';}catch(e){status.textContent=e.message||'Не удалось изменить напоминание.';}finally{buttons.forEach(b=>b.disabled=false);}};
    dialog.querySelector('#nativeEnable').onclick=()=>act(()=>reminders.enable(dialog.querySelector('input').value));
    dialog.querySelector('#nativeDisable').onclick=()=>act(()=>reminders.disable());
    dialog.querySelector('#nativeClose').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
  }
  window.EchoNative={
    accountChanged(){reminders.accountChanged().catch(()=>{});document.querySelectorAll('.viewsDialog').forEach(d=>{if(d.querySelector('#nativeTime'))d.close();});},
    settings:showSettings,
    async share(file){
      const path='echo-export-'+Date.now()+'.json';
      try{const out=await Filesystem.writeFile({path,directory:Directory.Cache,data:await file.text(),encoding:Encoding.UTF8});await Share.share({title:'Мои данные ECHO',url:out.uri,dialogTitle:'Сохранить экспорт'});}
      finally{await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{});}
    }
  };
  App.addListener('backButton',({canGoBack})=>{if(document.querySelector('dialog[open]'))document.querySelector('dialog[open]').close();else if(canGoBack)history.back();else api.home();});
  App.addListener('appStateChange',({isActive})=>{if(isActive)reminders.accountChanged().catch(()=>{});});
  LocalNotifications.addListener('localNotificationActionPerformed',()=>api.home());
  reminders.accountChanged().catch(()=>{});
}
