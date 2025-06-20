import {
  testGetBgGeoPos,
  onTestFetch,
  onCheckPermissions,
  onRequestPermissions,
  onTestCapAppClearBadge,
  onTestCapAppGetInfo,
  onTestCapAppGetState,
  onTestCapAppSetBadge,
  onTestCapDeviceBattery,
  onTestCapDeviceNetwork,
  onTestCapKVGet,
  onTestCapKVRemove,
  onTestCapKVSet,
  onTestCapLocation,
  onTestCapNotification,
} from "../state";

export function NativeFeatureScreen() {
  return (
    <div data-name="native" class="page">
      <div class="navbar">
        <div class="navbar-bg"></div>
        <div class="navbar-inner">
          <div class="title">Native Integrations</div>
        </div>
      </div>

      <div class="page-content">
        <p>Native Background Features</p>
        <button type="button" class="button" onClick={onCheckPermissions}>
          Check Permissions
        </button>
        <button type="button" class="button" onClick={onRequestPermissions}>
          Request Permissions
        </button>
        <button type="button" class="button" onClick={onTestCapKVSet}>
          Test Capacitor KV Set
        </button>
        <button type="button" class="button" onClick={onTestCapKVGet}>
          Test Capacitor KV Get
        </button>
        <button type="button" class="button" onClick={onTestCapKVRemove}>
          Test Capacitor KV Remove
        </button>
        <button type="button" class="button" onClick={onTestCapAppGetInfo}>
          Test Capacitor App Get Info
        </button>
        <button type="button" class="button" onClick={onTestCapAppGetState}>
          Test Capacitor App Get State
        </button>
        <button type="button" class="button" onClick={onTestCapAppSetBadge}>
          Test Capacitor App Set Badge
        </button>
        <button type="button" class="button" onClick={onTestCapAppClearBadge}>
          Test Capacitor App Clear Badge
        </button>
        <button type="button" class="button" onClick={onTestCapDeviceBattery}>
          Test Capacitor Device Battery
        </button>
        <button type="button" class="button" onClick={onTestCapDeviceNetwork}>
          Test Capacitor Device Network
        </button>
        <button type="button" class="button" onClick={onTestCapLocation}>
          Test Capacitor Location
        </button>
        <button type="button" class="button" onClick={onTestCapNotification}>
          Test Capacitor Notification
        </button>
        <button type="button" class="button" onClick={onTestFetch}>
          Test Fetch
        </button>
        <button type="button" class="button" onClick={testGetBgGeoPos}>
          Test Get Background Location
        </button>
      </div>

      <div class="toolbar toolbar-top">
        <div class="toolbar-inner">
          <a href="#" class="link">
            Link 1
          </a>
          <a href="#" class="link">
            Link 2
          </a>
        </div>
      </div>
    </div>
  );
}
