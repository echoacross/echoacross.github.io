export const REMINDER_ID = 23001;
export function createReminders({plugin, owner, storage}) {
  let queue = Promise.resolve();
  let generation = 0;
  const key = id => 'echo-reminder-v1-' + id;
  const read = id => { try { return JSON.parse(storage.getItem(key(id)) || 'null'); } catch { return null; } };
  const run = task => { const result = queue.then(task); queue = result.catch(() => {}); return result; };
  async function cancel() {
    await plugin.cancel({notifications:[{id:REMINDER_ID}]});
    await plugin.removeDeliveredNotifications({notifications:[{id:REMINDER_ID}]});
  }
  async function schedule(time) {
    const [hour,minute] = time.split(':').map(Number);
    await plugin.schedule({notifications:[{id:REMINDER_ID,title:'ECHO',body:'Минута для себя.',schedule:{on:{hour,minute},repeats:true},extra:{route:'home'}}]});
  }
  return {
    read,
    accountChanged() {
      const ticket = ++generation;
      return run(async () => {
        await cancel();
        const id=owner(), pref=id&&read(id);
        if(ticket!==generation || !id || !pref?.enabled || !/^([01]\d|2[0-3]):[0-5]\d$/.test(pref.time||''))return;
        if((await plugin.checkPermissions()).display==='granted' && ticket===generation)await schedule(pref.time);
      });
    },
    enable(time) {
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return Promise.reject(new Error('Выбери время.'));
      const id=owner(), ticket=generation;
      if(!id)return Promise.reject(new Error('Сначала войди.'));
      return run(async () => {
        const permission=await plugin.requestPermissions();
        if(id!==owner() || ticket!==generation)throw new Error('Аккаунт изменился.');
        if(permission.display!=='granted')throw new Error('Разреши уведомления в настройках телефона.');
        await cancel(); await schedule(time);
        if(id!==owner() || ticket!==generation){await cancel();throw new Error('Аккаунт изменился.');}
        try{storage.setItem(key(id),JSON.stringify({enabled:true,time}));}catch(e){await cancel();throw new Error('Не удалось сохранить настройку.');}
      });
    },
    disable() {
      const id=owner(); ++generation;
      if(id)storage.removeItem(key(id));
      return run(cancel);
    }
  };
}
