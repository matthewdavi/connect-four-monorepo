import { exec } from "child_process";
import fs from "fs";
import path from "path";

const wasmPackBuild = () => {
  return new Promise((resolve, reject) => {
    exec(
      "wasm-pack build wasm --target web --out-dir ./wasm-build",
      (error, stdout, stderr) => {
        if (error) {
          console.error(`wasm-pack build error: ${error}`);
          return reject(error);
        }
        console.log(stdout);
        console.error(stderr);
        resolve(null);
      }
    );
  });
};

const copyToPublic = () => {
  const sourceDir = path.join(__dirname, "./wasm-build");
  const destDir = path.join(__dirname, "../../apps/next-connect-four/public");

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.readdirSync(sourceDir).forEach((file) => {
    if (file.endsWith(".wasm") || file.endsWith(".js")) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} to ${destPath}`);
    }
  });
};

async function buildAndCopyWasm() {
  try {
    await wasmPackBuild();
    copyToPublic();
    console.log("WASM build and copy completed successfully");
  } catch (error) {
    console.error("Error during WASM build and copy:", error);
    process.exit(1);
  }
}

buildAndCopyWasm();
