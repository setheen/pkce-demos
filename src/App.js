import env from '../env';
import Auth0 from 'auth0-js';
import decodeJwt from 'jwt-decode';
import Session from './Session';
import PKCEAuth from './PKCEAuth';
import autobind from 'core-decorators/lib/autobind';

import Cordova from './adapters/Cordova';
import Chrome from './adapters/Chrome.Identity';
import Electron from './adapters/Electron';

const $$ = (arg) => document.querySelectorAll(arg);
const $ = (arg) => document.querySelector(arg);
const $i = (id) => document.getElementById(id);
const $c = (className) => document.getElementsByClassName(className);

/*
 * 
 * App class is an example application which aims to 
 * be a simple and framework agnostic app, written purely
 * in javascript. This should translate to most modern
 * frameworks 
 * 
 */

@autobind
class App {
    constructor() {
        this.getApplicableAdapter();
        this.auth0 = new window.ConnectedDriverAuth("development");
        this.auth0.subscribe(authData =>
        {
            if (authData)
            {
                console.log("Is Authenticated", authData);
                debugger;
                this.auth0.getFirebaseTokenForConnectedDriver().then(token => console.log("CDToken", token));
                this.auth0.getFirebaseTokenForIris().then(token => console.log("IrisToken", token));
                this.auth0.getFirebaseTokenForTimeline().then(token => console.log("TimelineToken", token));
            }
            else
                console.log("Not Authenticated");
        });
        //this.test = new window.ConnectedDriverAuth("development");
        this.state = {
            //authenticated: false,
            accessToken: false,
            currentRoute: '/',
            routes: {
                '/': {
                    id: 'loading',
                    onMount: (page) => {
                        console.log("loading");
                        if (this.auth0.isAuthenticated())
                            return this.redirectTo('/home');
                        return this.redirectTo('/login');
                    }
                },
                '/login': {
                    id: 'login',
                    onMount: (page) => {
                        debugger;
                        console.log("am here", this.auth0.isAuthenticated());
                        if (this.auth0.isAuthenticated()) {
                            return this.redirectTo('/home');
                        }
                        const loginButton = page.querySelector('.btn-login');
                        loginButton.addEventListener('click', e => this.login(e));
                    }
                },
                '/home': {
                    id: 'profile',
                    onMount: (page) => {
                        console.log(`profile page, authenticated: ${this.auth0.isAuthenticated()}`);
                        if (!this.auth0.isAuthenticated()) {
                            return this.redirectTo('/login');
                        }
                        const logoutButton = page.querySelector('.btn-logout');
                        const profileCodeContainer = page.querySelector('.profile-json')
                        logoutButton.addEventListener('click', e => this.logout(e));
                        this.loadProfile().then((profile) => {
                            profileCodeContainer.textContent = JSON.stringify(profile, null, 4);
                        });
                    }
                }
            }
        };
    }

    run(id) {
        // The first run parts
        this.container = $(id);
        this.resumeApp();
    }

    loadProfile() {
        return new Promise((resolve, reject) => {
            debugger;
            resolve(decodeJwt(this.state.accessToken));
            // this.auth0.userInfo(this.state.accessToken, (err, profile) => {
            //     if (err) reject(err);
            //     resolve(profile);
            // });
        });
    }

    getApplicableAdapter () {
        /* @TODO: Make this env specific so app size doesn't bloat*/
        if(window.electron){
            return Electron;
        }
        if(window.cordova){
            console.log("getting http server");
            var httpd = ( cordova && cordova.plugins && cordova.plugins.CorHttpd ) ? cordova.plugins.CorHttpd : null;
            console.log("httpd", httpd);
            httpd.startServer({ port: 8081, localhost_only: true}, url => console.log("startServer", url), err => console.error("startServerError", err));
            return Cordova;
        }
        if(window.chrome.runtime){
            return Chrome;
        }
    }

    login(e) {
        if (e.target) {
            e.target.disabled = true;
        }
        debugger;
        
        this.auth0.login()
        .then(() => this.resumeApp())
        .catch(error =>
        {
            debugger;
            console.log("what!");
            console.log(error);
        });
   
        // if(window.chrome && Chrome.getContext() !== 'background'){
        //     /* Send message and return, the background script will execute just this */
        //     return chrome.runtime.sendMessage({
        //         type: "authenticate"
        //     });
        // }

        // const Adapter = this.getApplicableAdapter();
        // const adapter = new Adapter(env.domain, env.packageIdentifier);
        // const pkceAuth = new PKCEAuth(env.domain, env.clientID, adapter.getRedirectURL());

        // const options = {
        //     scope: 'openid profile',
        //     audience: env.audience
        // };

        // const url = pkceAuth.buildAuthorizeUrl(options);

        // return adapter.getResponseURL(url)
        //     .then((redirectUrl) => new Promise((resolve, reject) => {
        //         const callback = (err, authResult) =>
        //          {
        //              debugger;
        //              console.log('here');
        //              err ? reject(err) : resolve(authResult);
        //          };
        //         pkceAuth.handleCallback(redirectUrl, callback);
        //     }))
        //     .then((authResult) => {
        //         localStorage.setItem('access_token', authResult.idToken);
        //         if(window.chrome && Chrome.getContext() === 'background'){
        //             return; 
        //         }
        //         this.resumeApp();
        //     });
    }

    logout(e) {

        try
        {
        this.auth0.logout()
        .then(() =>
        {
            this.resumeApp();
        })
        .catch(e => 
        {
            debugger;
            console.log("what!");
            console.log(e);
        })
    }
    catch(e)
    {
        debugger;
        console.log(e);
    }
        // return new Promise((resolve, reject) =>
        // {
        //     debugger;
        //     localStorage.removeItem('access_token');
        //     const Adapter = this.getApplicableAdapter();
        //     const adapter = new Adapter(env.domain, env.packageIdentifier);
        //     const url = `https://${env.domain}/v2/logout?client_id=${env.clientID}&returnTo=${adapter.getRedirectURL()}`;
        //     adapter.getResponseURL(url)
        //     .then(result => 
        //     {
        //         debugger;
        //         this.resumeApp();
        //         resolve();
        //     })
        //     .catch(e =>
        //     {
        //         debugger;
        //         console.error(e);
        //         reject();
        //     })
        // });
    }

    redirectTo(route) {
        if (!this.state.routes[route]) {
            throw new Error(`Unknown route "${route}".`);
        }
        this.state.currentRoute = route;
        this.render();
    }

    resumeApp() {
        debugger;
        const accessToken = localStorage.getItem('access_token');

        if (accessToken) {
            const payload = decodeJwt(accessToken);
            if (payload.exp > Date.now() / 1000) {
                //this.state.authenticated = true;
                this.state.accessToken = accessToken;
            }
        } else {
            //this.state.authenticated = false;
            this.state.accessToken = '';
        }

        this.render();
    }

    resumeAuth (...args) {
        /* This is to avoid cordova from crashing on iOS */
        setTimeout(function(){
            Session.handleCallback(...args);
        }, 4);
    }

    render() {
        const currRoute = this.state.routes[this.state.currentRoute];
        const currRouteEl = $i(currRoute.id);
        const element = document.importNode(currRouteEl.content, true);
        this.container.innerHTML = '';
        this.container.appendChild(element);
        currRoute.onMount(this.container);
    }
}

export default App;