import { Redirect, Route, RouterSlot } from "defuss";
import { LoginScreen } from "./screens/login";
import { OcrScreen } from "./screens/ocr";
import { TransformScreen } from "./screens/transform";
import { PreAuthLayout } from "./layouts/pre-auth";
import { AppLayout } from "./layouts/app-layout";
import { initI18n } from "./i18n";

initI18n();

export function RouterOutlet() {
  const isLoggedIn = !!window.$APP_PROPS?.user;

  return (
    <>
      {isLoggedIn && <Redirect path="/" exact={true} to="/ocr" />}

      <Route path="/" component={LoginRoute} />
      <Route path="/ocr" component={OcrRoute} />
      <Route path="/transform" component={TransformRoute} />

      {!isLoggedIn && <Redirect path="/ocr" to="/" />}
      {!isLoggedIn && <Redirect path="/transform" to="/" />}
    </>
  );
}

function LoginRoute() {
  return (
    <PreAuthLayout>
      <LoginScreen />
    </PreAuthLayout>
  );
}

function OcrRoute() {
  return (
    <AppLayout>
      <OcrScreen />
    </AppLayout>
  );
}

function TransformRoute() {
  return (
    <AppLayout>
      <TransformScreen />
    </AppLayout>
  );
}

export function App() {
  return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
