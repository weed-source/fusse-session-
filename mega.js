import mega from "megajs";

const credentials = {
  email: "wohabo1681@calorpg.com",
  password: "Chamindu2008",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};

export function upload(stream, filename) {
  return new Promise((resolve, reject) => {
    try {
      const storage = new mega.Storage(credentials, () => {
        const uploadStream = storage.upload({
          name: filename,
          allowUploadBuffering: true
        });

        stream.pipe(uploadStream);

        storage.on("add", (file) => {
          file.link((err, url) => {
            if (err) return reject(err);

            storage.close();
            resolve(url);
          });
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}
