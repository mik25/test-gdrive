var credentials = {
  client_id: "949202765169-c0jmfth7otlo5i5s8in7d1e6qkgljqc1.apps.googleusercontent.com",
  client_secret: "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",
  refresh_token: "1//06ZT8TMS4NWETCgYIARAAGAYSNwF-L9Irg_wlUOEI1CTAa9ayO8M3AkcJdle4-LAEaSrk4cbYKOfLRq6AUDo_gQAMN5pxVJ3y99s",
};

async function handleRequest(request) {
  var url = new URL(request.url);

  if (url.pathname == "/manifest.json") {
    var json = JSON.stringify(
      {
        catalogs: [],
        description: "files from GDrive",
        id: "bb4.stremio.googledrive",
        logo: "https://fonts.gstatic.com/s/i/productlogos/drive_2020q4/v8/web-512dp/logo_drive_2020q4_color_1x_web_512dp.png",
        name: "GDrive Demo",
        resources: ["stream"],
        types: ["movie", "series"],
        version: "1.0.0",
      },
      null,
      2
    );

    return new Response(json, {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  var [path, type, idj] = url.pathname.substring(1).split("/");
  var id = idj.split(".")[0];

  var results = await searchDrive(id, type);

  var json = JSON.stringify({ streams: results }, null, 2);

  return new Response(json, {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
function getMeta(id, type) {
  var [tt, s, e] = id.split(":");

  return fetch(`https://v2.sg.media-imdb.com/suggestion/t/${tt}.json`)
    .then((res) => res.json())
    .then((json) => json.d[0])
    .then(({ l, y }) => ({ name: l, year: y }))
    .catch((err) =>
      fetch(`https://v3-cinemeta.strem.io/meta/${type}/${tt}.json`)
        .then((res) => res.json())
        .then((json) => json.meta)
    );
}

async function searchDrive(id, type) {
  var q = await createQ(id, type);

  var queryParams = {
    q: q,
    corpora: "allDrives",
    includeItemsFromAllDrives: true,
    //orderBy: "quotaBytesUsed desc",
    pageSize: 1000,
    supportsAllDrives: true,
    fields: "files(id,name,size,driveId,md5Checksum
function getSize(size) {
  if (size >= 1099511627776) {
    size = (size / 1099511627776).toFixed(2) + " TB";
  } else if (size >= 1073741824) {
    size = (size / 1073741824).toFixed(2) + " GB";
  } else if (size >= 1048576) {
    size = (size / 1048576).toFixed(2) + " MB";
  } else if (size >= 1024) {
    size = (size / 1024).toFixed(2) + " KB";
  } else {
    size = size + " B";
  }

  return size;
}

function getQuality(name) {
  var match = /([0-9]{3,4})p/.exec(name);

  if (match) {
    return match[1];
  } else {
    return "unknown";
  }
}

function getCodec(name) {
  var match = /\.([a-zA-Z0-9]{3,4})$/.exec(name);

  if (match) {
    return match[1].toUpperCase();
  } else {
    return "";
  }
}

async function refreshToken() {
  if (Date.now() < credentials.expiry_date) {
    return;
  }

  var params = new URLSearchParams();
  params.append("client_id", credentials.client_id);
  params.append("client_secret", credentials.client_secret);
  params.append("refresh_token", credentials.refresh_token);
  params.append("grant_type", "refresh_token");

  var res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params,
  });

  var json = await res.json();

  credentials.token = json.access_token;
  credentials.expiry_date = Date.now() + json.expires_in * 1000 - 30000;
}


