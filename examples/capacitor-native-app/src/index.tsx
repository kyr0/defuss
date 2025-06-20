import "framework7/css";
import Framework7 from "framework7/bundle";

import { Route, $ } from "defuss";
import { render } from "defuss/client";

import { HomeScreen } from "./screens/home";
import { NativeFeatureScreen } from "./screens/native";

import { registerPlugin } from "@capacitor/core";
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation") as any;

BackgroundGeolocation.addWatcher(
  {
    // If the "backgroundMessage" option is defined, the watcher will
    // provide location updates whether the app is in the background or the
    // foreground. If it is not defined, location updates are only
    // guaranteed in the foreground. This is true on both platforms.

    // On Android, a notification must be shown to continue receiving
    // location updates in the background. This option specifies the text of
    // that notification.
    backgroundMessage: "We need your location for XYZ.",

    // The title of the notification mentioned above. Defaults to "Using
    // your location".
    backgroundTitle: "Location tracking active",

    // Whether permissions should be requested from the user automatically,
    // if they are not already granted. Defaults to "true".
    requestPermissions: true,

    // If "true", stale locations may be delivered while the device
    // obtains a GPS fix. You are responsible for checking the "time"
    // property. If "false", locations are guaranteed to be up to date.
    // Defaults to "false".
    stale: false,

    // The minimum number of metres between subsequent locations. Defaults
    // to 0.
    distanceFilter: 50,
  },
  // @ts-ignore
  function callback(location, error) {
    if (error) {
      if (error.code === "NOT_AUTHORIZED") {
        if (
          window.confirm(
            "This app needs your location, " +
              "but does not have permission.\n\n" +
              "Open settings now?",
          )
        ) {
          // It can be useful to direct the user to their device's
          // settings when location permissions have been denied. The
          // plugin provides the 'openSettings' method to do exactly
          // this.
          BackgroundGeolocation.openSettings();
        }
      }
      return console.error(error);
    }
    return console.log("Background location tracking result", location);
  },
);

// Framework7 initialization
new Framework7({
  el: "#app",
  name: "Defuss Capacitor",
  panel: {
    swipe: true,
  },
  theme: "auto",
  darkMode: "auto",
});

// defuss router outlet component
function RouterOutlet() {
  return (
    <>
      <Route path="/">
        <HomeScreen />
      </Route>

      <Route path="/native">
        <NativeFeatureScreen />
      </Route>
    </>
  );
}

// initial render
render(<RouterOutlet />, $(".view-main"));
