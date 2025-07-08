import { defineCustomElements } from '@ionic/pwa-elements/loader';
import './index.scss';

if (window) {
  // Ionic PWA Elements - For Capacitor Toast and other APIs (Camera etc)
  defineCustomElements(window);
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  root.render(
    <>
      {/* Ahsan: i removed the React.StrictMode on 25-1-25, yes we know other reasons that for firebase, sentry, etc the requests happens two times and yes it does work fine in production, but on integrations page, for slack integration which i was working on today, the backend api was getting called twice, also the signup api twice, and for signup it was created two records of same user email in localhost only, and for slack integration even after success connection it was giving "invalid request" error notifications, just because the api was getting called twice and for second time it was returning message "invalid request" for first api it was succeeding, so i removed it again, yes i added in few days ago and now i removed it again, so we will need something else (some other better way) to manage this properly, for now i need localhost working fine, as well as production */}
      <h1>Biometric Auth</h1>
    </>
  );
} else {
  console.error('Something went wrong! No root container found.');
}
