import {
  bookmarkOutline,
  mailOutline,
  mailSharp,
  paperPlaneOutline,
  paperPlaneSharp,
  arrowBackOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import { createRef, Router, $ } from "defuss";
import "./Menu.css";

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: Array<AppPage> = [
  {
    title: "Home",
    url: "/home",
    iosIcon: mailOutline,
    mdIcon: mailSharp,
  },
  {
    title: "List",
    url: "/list",
    iosIcon: paperPlaneOutline,
    mdIcon: paperPlaneSharp,
  },
];

const labels = [
  "Tiny",
  "Simple",
  "Powerful",
  "Smart",
  "Fast",
  "Great DX",
  "Modern",
  "Fun",
];

const MenuList = () => {
  console.log("MenuList called");
  return (
    <>
      <ion-list-header>defuss with Ionic</ion-list-header>
      <ion-note>defuss@ionicframework.com</ion-note>

      <ion-item
        lines="none"
        detail={false}
        button
        onClick={() => history.back()}
      >
        <ion-icon
          aria-hidden="true"
          slot="start"
          icon={arrowBackOutline}
        ></ion-icon>
        <ion-label>Back</ion-label>
      </ion-item>

      <ion-item
        lines="none"
        detail={false}
        button
        onClick={() => history.forward()}
      >
        <ion-icon
          aria-hidden="true"
          slot="start"
          icon={arrowForwardOutline}
        ></ion-icon>
        <ion-label>Forward</ion-label>
      </ion-item>

      {appPages.map((appPage) => {
        return (
          <ion-menu-toggle key={appPage.url} auto-hide="false">
            <ion-item
              class={location.pathname === appPage.url ? "selected" : ""}
              lines="none"
              detail={false}
              button
              onClick={() => Router.navigate(appPage.url)}
            >
              <ion-icon
                aria-hidden="true"
                slot="start"
                icon={appPage.iosIcon}
              ></ion-icon>
              <ion-label>{appPage.title}</ion-label>
            </ion-item>
          </ion-menu-toggle>
        );
      })}
    </>
  );
};

export const Menu = () => {
  const listRef = createRef<HTMLIonListElement>();

  Router.onRouteChange(async () => {
    console.log("Router.onRouteChange called");
    // the following is a web component and defuss can't handle that?
    if (listRef.current) {
      await $(listRef).update(MenuList());
    }
  });

  return (
    <ion-menu content-id="main" type="overlay">
      <ion-content>
        <ion-list id="inbox-list" >
          <MenuList ref={listRef} />
        </ion-list>

        <ion-list id="labels-list">
          <ion-list-header>Labels</ion-list-header>
          {labels.map((label) => (
            <ion-item lines="none" key={label}>
              <ion-icon
                aria-hidden="true"
                slot="start"
                icon={bookmarkOutline}
              ></ion-icon>
              <ion-label>{label}</ion-label>
            </ion-item>
          ))}
        </ion-list>
      </ion-content>
    </ion-menu>
  );
};
