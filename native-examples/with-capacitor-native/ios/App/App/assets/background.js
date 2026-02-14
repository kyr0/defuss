addEventListener("syncTest", (resolve, reject, args) => {
  console.log("calling sync test");
  setTimeout(() => {
    console.log("tick");
    resolve();
  }, 3000);
});

addEventListener("asyncTest", async (resolve, reject, args) => {
  console.log("calling async test");
  await new Promise((res) => {
    setTimeout(() => {
      console.log("tick");
      res();
    }, 3000);
  });
  console.log("returning async result");
  resolve();
});

addEventListener("argsTest", async (resolve, reject, args) => {
  try {
    console.log("accepted these args: " + JSON.stringify(args));
    const updatedUser = args.user;
    updatedUser.firstName = updatedUser.firstName + " HELLO";
    updatedUser.lastName = updatedUser.lastName + " WORLD";

    resolve(updatedUser);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("errorTest", async (resolve, reject, args) => {
  try {
    const undefinedObject = args.myUndefinedObject;
    undefinedObject.fakeFunc();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("fetchTest", async (resolve, reject, args) => {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");

    if (!res.ok) {
      throw new Error("Fetch GET request failed");
    }

    const todo = await res.json();
    resolve(todo);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

// capacitor APIs
addEventListener("testCapKVSet", async (resolve, reject, args) => {
  try {
    CapacitorKV.set("testValue", args.value);
    resolve();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapKVGet", async (resolve, reject, args) => {
  try {
    const result = CapacitorKV.get("testValue");
    console.log(result);
    console.log(JSON.stringify(result));
    resolve(result);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapKVRemove", async (resolve, reject, args) => {
  try {
    CapacitorKV.remove("testValue");
    resolve();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapNotification", async (resolve, reject, args) => {
  try {
    let scheduleDate = new Date();
    scheduleDate.setSeconds(scheduleDate.getSeconds() + 10);

    CapacitorNotifications.schedule([
      {
        id: 100,
        title: "BEEP ME HARDER!",
        body: "A test message from the Enterprise Background Runner",
        scheduleAt: scheduleDate,
      },
    ]);

    resolve();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapacitorGeolocation", async (resolve, reject, args) => {
  try {
    const location = await CapacitorGeolocation.getCurrentPosition();
    console.log("current location: " + JSON.stringify(location));
    resolve(location);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener(
  "testCapacitorDeviceBatteryStatus",
  (resolve, reject, args) => {
    try {
      const info = CapacitorDevice.getBatteryStatus();
      console.log(JSON.stringify(info));
      resolve(info);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  }
);

addEventListener(
  "testCapacitorDeviceNetworkStatus",
  (resolve, reject, args) => {
    try {
      const info = CapacitorDevice.getNetworkStatus();
      console.log(JSON.stringify(info));
      resolve(info);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  }
);

addEventListener("testCapacitorAppGetBadge", (resolve, reject, args) => {
  try {
    const value = CapacitorNotifications.getBadge();
    console.log(JSON.stringify(value));
    resolve(value);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapacitorAppSetBadge", (resolve, reject, args) => {
  try {
    CapacitorNotifications.setBadge({
      count: args.count,
      notificationTitle: "You have new messages",
      notificationSubtitle: "testing, testing, 1, 2, 3",
    });
    resolve();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapacitorAppClearBadge", (resolve, reject, args) => {
  try {
    CapacitorNotifications.clearBadge();
    resolve();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapacitorAppGetInfo", (resolve, reject, args) => {
  try {
    const info = CapacitorApp.getInfo();
    console.log(JSON.stringify(info));
    resolve(info);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("testCapacitorAppGetState", (resolve, reject, args) => {
  try {
    const state = CapacitorApp.getState();
    console.log(JSON.stringify(state));
    resolve(state);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("remoteNotification", (resolve, reject, args) => {
  console.log("received silent push notification");

  CapacitorNotifications.schedule([
    {
      id: 1000,
      title: "Enterprise Background Runner",
      body: "Received silent push notification",
    },
  ]);

  console.log(`details: ${JSON.stringify(args)}`);

  resolve();
});

addEventListener("checkWatchReachability", (resolve, reject, args) => {
  const reachable = CapacitorWatch.isReachable();
  try {
    resolve({
      reachable: reachable,
    });
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener("sendMessageToWatch", (resolve, reject, args) => {
  console.log("sending message to watch...");

  CapacitorWatch.send({
    msg: "Hello World",
  });

  try {
    resolve();
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener(
  "WatchConnectivity_activationDidCompleteWith",
  (resolve, reject, args) => {
    console.log("watch paired completed");
    resolve();
  }
);

addEventListener(
  "WatchConnectivity_sessionDidBecomeInactive",
  (resolve, reject, args) => {
    console.log("watch session is inactive");
    resolve();
  }
);

addEventListener(
  "WatchConnectivity_sessionDidDeactivate",
  (resolve, reject, args) => {
    console.log("watch session is deactivated");
    resolve();
  }
);

addEventListener(
  "WatchConnectivity_didReceiveUserInfo",
  (resolve, reject, args) => {
    console.log(`watch sent user info: ${JSON.stringify(args)}`);
    resolve();
  }
);

addEventListener(
  "WatchConnectivity_didReceiveMessage",
  (resolve, reject, args) => {
    try {
      const msg = args.message.result;

      CapacitorNotifications.schedule([
        {
          title: "Enterprise Background Runner",
          body: msg,
        },
      ]);

      console.log(`watch sent data: ${JSON.stringify(args)}`);
      resolve();
    } catch (err) {
      console.error(err);
      reject(err);
    }
  }
);

addEventListener("testGetBgGeoPos", (resolve, reject, args) => {
  console.log("getting background geolocation position...");  
  try {
    const encodedPos = CapacitorKV.get("bgGeoPos");
    console.log("background geolocation position: " + encodedPos);
    resolve(encodedPos);
  } catch (err) {
    console.error(err);
    reject(err);
  }
});

addEventListener(
  "monitorLocation",
  (resolve, reject, args) => {
    console.log("monitoring location changes...");

    CapacitorKV.set("bgGeoPos", "Triggered location monitoring");
    
    try {
      let pos = CapacitorGeolocation.getCurrentPosition();

      CapacitorKV.set("bgGeoPos", "Pos promised");
      if (!pos) {
        CapacitorKV.set("bgGeoPos", "No pos!");
        reject(new Error("No position data available (null)"));
      }


      pos.then((position) => {
        CapacitorKV.set("bgGeoPos", "No received!");

        console.log("current position: " + JSON.stringify(position));

        CapacitorKV.set("bgGeoPos", JSON.stringify(position));

        CapacitorNotifications.schedule([
          {
            title: "BEEPER",
            body: "You have been TRACKED!",
          },
        ]);

        resolve();
      }).catch((err) => {
        console.error("Error getting current position: ", err);
        resolve();
      });  
    
    } catch (err) {
      console.error("Error monitoring location: ", err);
      reject(err);
    }
  }
);