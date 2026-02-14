import { BackgroundRunner } from "@capacitor/background-runner";

const setCommandOutput = (output: string) => {
  console.log("commandOutput", output);
};

export const onCheckPermissions = async () => {
  setCommandOutput("");
  try {
    const permissions = await BackgroundRunner.checkPermissions();
    setCommandOutput(`permissions: ${JSON.stringify(permissions)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onRequestPermissions = async () => {
  setCommandOutput("");
  try {
    const permissions = await BackgroundRunner.requestPermissions({
      apis: ["geolocation", "notifications"],
    });
    setCommandOutput(`permissions: ${JSON.stringify(permissions)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapKVSet = async () => {
  setCommandOutput("");
  try {
    await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapKVSet",
      details: {
        value: "Hello World",
      },
    });
    setCommandOutput(`success: stored value 'Hello World'`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapKVGet = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapKVGet",
      details: {},
    });
    setCommandOutput(`success: retrieved ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapKVRemove = async () => {
  setCommandOutput("");
  try {
    await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapKVRemove",
      details: {},
    });
    setCommandOutput("success: value removed");
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapNotification = async () => {
  setCommandOutput("");
  try {
    await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapNotification",
      details: {},
    });
    setCommandOutput("success: notification scheduled");
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapLocation = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorGeolocation",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapDeviceBattery = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorDeviceBatteryStatus",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapDeviceNetwork = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorDeviceNetworkStatus",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapAppSetBadge = async () => {
  setCommandOutput("");
  try {
    await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorAppSetBadge",
      details: {
        count: 42, // Example badge count
      },
    });
    setCommandOutput("success");
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapAppClearBadge = async () => {
  setCommandOutput("");
  try {
    await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorAppClearBadge",
      details: {},
    });
    setCommandOutput("success");
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapAppGetInfo = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorAppGetInfo",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestCapAppGetState = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testCapacitorAppGetState",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const onTestFetch = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "fetchTest",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};

export const testGetBgGeoPos = async () => {
  setCommandOutput("");
  try {
    const response = await BackgroundRunner.dispatchEvent({
      label: "de.aronhomberg.defusscapacitor.background.task",
      event: "testGetBgGeoPos",
      details: {},
    });
    setCommandOutput(`success: ${JSON.stringify(response)}`);
  } catch (err) {
    setCommandOutput(`ERROR: ${err}`);
  }
};
