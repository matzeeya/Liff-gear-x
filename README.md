# LFFE MENU and Firebase cloud functions use in dialog-flow ,for hackathon project 
### Features
Create for hackathon project 
# How to install
Use powershell or cmd and type by order, please see below.
- `git clone https://github.com/kantinanm/gear-x-liff-menu.git`
- `cd gear-x-liff-menu`
- > install package dependency in this project.
    `npm install`
- > install package dependency in cloud functions  project.
    `cd functions`
    `npm install`
- > create config.js and modify value (in cloud functions folder).
  `cp config.js.default config.js` 
  > In windows use command `copy config.js.default config.js` 
  > at config.js file to modify value, 
  ```javascript
     exports.user = ''; //reg user
     exports.password = ''; // reg password

- Go to firebase console , choose your project and create Cloud Firestore , set region east-2

# Deployment
- `cd gear-x-liff-menu`
- follow command below.
  >  `firebase login `
- Edit value in firebaserc.
    ```javascript
        {
            "projects": {
                "default": "project id " // your project id
            }
        };
- follow command below.
  >  `firebase projects:list `for check current folder project is have been mapping from your project id. 
- build vue for prepair to dyploy hosting use command below.
  >  `npm run build ` to create dist folder.
- Let go deploy command below.
 >  `firebase deploy --only functions ` 

