import { $, createRef, type Props } from "defuss";
import { transval, rule, access } from "defuss-transval";

export interface LogonScreenProps extends Props {
  cDriveBasePath?: string;
  showGuestUser?: boolean;
  onTurnOffComputer?: () => void;
  onGuestLogon?: () => void;
  onUserLogonSubmit?: (
    userName: string,
    password: string,
  ) => Promise<boolean | string>;
}

export type LoginForm = {
  username: string;
  password: string;
};

export const LogonScreen = ({
  cDriveBasePath = "",
  showGuestUser = true,
  onTurnOffComputer,
  onGuestLogon,
  onUserLogonSubmit,
  ref = createRef<HTMLElement>(),
}: LogonScreenProps) => {
  const userLoginFormRef = createRef<HTMLFormElement>();

  $(userLoginFormRef).on("submit", async (event) => {
    event.preventDefault();
    const formData = await $(userLoginFormRef).form();

    const loginForm = access<LoginForm>();

    console.log("Form submitted with data:", formData);
    const { isValid, getMessages, getData, getField } = transval(
      rule(loginForm.username).asString().isRequired(),
      rule(loginForm.password).asString().isRequired(),
    );

    if (!(await isValid(formData))) {
      console.error("Form validation failed:", getMessages());
      return;
    }

    const loginFormData = getData();

    const loginResult = await onUserLogonSubmit?.(
      loginFormData.username,
      loginFormData.password,
    );

    console.log("Login result:", loginResult);
  });

  const onActivateAccountLogin = (evt: Event) => {
    $(evt.target as HTMLElement)
      .closest(".logon-screen__account")
      .addClass("active");
  };

  return (
    <div class="logon-screen crt" ref={ref}>
      <div class="logon-screen__top"></div>
      <div class="logon-screen__center">
        <div class="logon-screen__instructions">
          <img
            src={`${cDriveBasePath}/defuss_xp_logo.webp`}
            alt="defuss XP logo"
          />
          <span>To begin, click your user name</span>
        </div>
        <div class="logon-screen__accounts">
          <div
            tabindex="-1"
            class="logon-screen__account"
            onClick={onActivateAccountLogin}
          >
            <div class="logon-screen__account-icon">
              <img
                src={`${cDriveBasePath}/icons/profile_picture_duck.webp`}
                alt="duck"
              />
            </div>
            <div class="logon-screen__account-details">
              <span class="logon-screen__account-name">Duck</span>
              <div class="logon-screen__password">
                <span>Type your password</span>
                <form ref={userLoginFormRef}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    name="password"
                  />
                  <input type="hidden" name="username" value="Duck" />
                  <button class="logon-screen__submit" type="submit">
                    <span></span>
                  </button>
                  <button class="logon-screen__question" type="button">
                    <span>?</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {showGuestUser && (
            <div
              tabindex="-1"
              class="logon-screen__account"
              onClick={onGuestLogon}
            >
              <div class="logon-screen__account-icon">
                <img
                  src={`${cDriveBasePath}/icons/profile_picture_chess.webp`}
                  alt="chess"
                />
              </div>
              <div class="logon-screen__account-details">
                <span class="logon-screen__account-name">Guest</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div class="logon-screen__bottom">
        <div class="logon-screen__turn-off" onClick={onTurnOffComputer}>
          <button type="button" class="logon-screen__turn-off-icon"></button>{" "}
          <span>Turn off computer</span>
        </div>
        <div class="logon-screen__logon-info">
          <span>
            After you log on, you can add or change accounts.
            <br />
            Just go to Control Panel and click User Accounts.
          </span>
        </div>
      </div>
    </div>
  );
};
