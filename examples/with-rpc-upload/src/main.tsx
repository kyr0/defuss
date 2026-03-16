import { render, $, createRef } from "defuss";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import { uploadFile } from "./upload-client.js";

const App = () => {
  const statusRef = createRef<HTMLParagraphElement>();
  const logRef = createRef<HTMLDivElement>();

  const onFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    $(statusRef).text("Uploading...");
    $(logRef).html("");

    let lastLoggedPercent = -1;

    for await (const progress of uploadFile(file, rpcBaseUrl)) {
      $(statusRef).text(`${progress.status}: ${progress.percent}%`);

      if (progress.status === "uploading" && progress.percent > lastLoggedPercent) {
        for (let p = lastLoggedPercent + 1; p <= progress.percent; p++) {
          $(logRef).html(
            $(logRef).html() +
            `<div>${p}% \u2014 ${progress.bytesUploaded} / ${progress.totalBytes} bytes</div>`,
          );
        }
        lastLoggedPercent = progress.percent;
      }

      if (progress.status === "confirmed") {
        $(statusRef).text(`Upload confirmed! MD5 match: ${progress.clientMd5 === progress.serverMd5}`);
      } else if (progress.status === "rejected") {
        $(statusRef).text("Upload rejected: integrity check failed");
      } else if (progress.status === "error") {
        $(statusRef).text("Upload error");
      }
    }
  };

  return (
    <div>
      <h1>defuss-rpc File Upload</h1>
      <input type="file" onChange={onFileChange} />
      <p ref={statusRef}>Select a file to upload</p>
      <div ref={logRef} style="font-family:monospace;font-size:12px;max-height:300px;overflow-y:auto"></div>
      <p>RPC: {rpcBaseUrl}</p>
    </div>
  );
};

render(<App />, $("#app")._nodes[0] as HTMLElement);
