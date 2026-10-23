import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const cap=(...args)=>execFileSync(process.execPath,['node_modules/@capacitor/cli/bin/capacitor',...args],{stdio:'inherit'});
for(const platform of ['android','ios'])if(!fs.existsSync(platform))cap('add',platform);
const manifest='android/app/src/main/AndroidManifest.xml';
let android=fs.readFileSync(manifest,'utf8');
android=android.replace('android:allowBackup="true"','android:allowBackup="false" android:usesCleartextTraffic="false"');
fs.writeFileSync(manifest,android);
const gradle='android/app/build.gradle';fs.writeFileSync(gradle,fs.readFileSync(gradle,'utf8').replace('versionName "1.0"','versionName "0.23.0"'));
fs.writeFileSync('ios/App/App/PrivacyInfo.xcprivacy',`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>NSPrivacyAccessedAPITypes</key><array><dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array></dict></array></dict></plist>`);
const project='ios/App/App.xcodeproj/project.pbxproj';let ios=fs.readFileSync(project,'utf8');
if(!ios.includes('EC0023000000000000000001')){
  const replace=(a,b)=>{if(!ios.includes(a))throw new Error('Xcode template changed: '+a);ios=ios.replace(a,b);};
  replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n EC0023000000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = EC0023000000000000000002; };');
  replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n EC0023000000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');
  replace('504EC3131FED79650016851F /* Info.plist */,','504EC3131FED79650016851F /* Info.plist */,\n EC0023000000000000000002 /* PrivacyInfo.xcprivacy */,');
  const at=ios.indexOf('504EC3021FED79650016851F /* Resources */ = {');
  if(at<0)throw new Error('Xcode Resources missing');const pos=ios.indexOf('files = (',at)+9;
  ios=ios.slice(0,pos)+'\n EC0023000000000000000001 /* PrivacyInfo.xcprivacy in Resources */,'+ios.slice(pos);
}
ios=ios.replaceAll('MARKETING_VERSION = 1.0;','MARKETING_VERSION = 0.23.0;');fs.writeFileSync(project,ios);
cap('sync');
