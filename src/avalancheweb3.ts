import extension from "extensionizer";
import PortStream from "extension-port-stream";

declare global {
  interface Window {
    avalanche: any;
  }
}

class Avalanche {
  constructor() {}

  test() {
    console.log("line 5");
    return "test";
  }

  getAddress() {
    return "asdfasdfasasdf";
  }
}
window.avalanche = new Avalanche();
const asdf = () => {
  // alert('asdf');
  console.log("avalanche", window.avalanche);
  // identify window type (popup, notification)
  // const windowType = getEnvironmentType();

  // // setup stream to background
  // const extensionPort = extension.runtime.connect({ name: windowType });
  const extensionPort = extension.runtime.connect({ name: "background" });
  const connectionStream = new PortStream(extensionPort);
  console.log("stream: ", { extensionPort, connectionStream });

  connectionStream.addListener("ev", (...args) => {
    console.log("this is from background: ", args);
  });

  setInterval(() => {
    console.log("emiting");
    connectionStream.emit("this is a message from stream");
  }, 20000);
  window.avalanche.test();
};

asdf();
