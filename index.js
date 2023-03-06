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
    fields: "files(id,name,size,driveId,md5Checksum)",
  };

  var queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  await refreshToken();

  var results = await fetch(
    "https://content.googleapis.com/drive/v3/files?" + queryString,
    {
      json: true,
      headers: {
        Authorization: "Bearer " + credentials.token,
      },
    }
  )
    .then((res) => res.json())
    .then((json) => {
      json.files.sort((a, b) => -1 * (a.size - b.size));
      return json;
    })
    .then((json) =>
      json.files.map((x) => {
        var name = ("GDrive " + getQuality(x.name)).trim();
        var title = `${x.name}\n${getSize(x.size)}\n${getCodec(x.name)}`.trim();
        //var url = `${proxyURL}/load/${x.id}`;
        var url = `https://www.googleapis.com/drive/v3/files/${x.id}?alt=media`;

        return {
          title,
          name,
          url,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: {
              request: {
                Accept: "application/json",
                Authorization: "Bearer " + credentials.token,
              },
            },
          },
        };
      })
    )
    .then((results) => {
      if (results.length == 0) {
        return [
          { name: "GDrive", title: "(404) No results", externalUrl: "/" },
        ];
      }
      return results;
    });

  return results;
}

async function createQ(id, type) {
  var { name, year } = await getMeta(id, type);

  var q =
    "trashed=false and mimeType contains 'video/' and not name contains 'trailer' and not name contains 'sample'";

  name.split(" ").forEach((x) => {
    q += " and ";
    if (x.includes("'")) {
      q += `(name contains '${x.replace(
        "'",
        ""
      )}' or name contains '${x.replace("'", "\\'")}')`;
    } else {
      q += `name contains '${x}'`;
    }
  });

  if (type == "movie") {
    q += ` and fullText contains '${year}'`;
  } else {
    var [tt, s, e] = id.split(":");

    var formatting = [[`${s}x${e}`], [`s${s}e${e}`], [`s${s}`, `e${e}`]];

    var seasonIsTwoDigit = parseInt(s) > 9;
    var episideIsTwoDigit = parseInt(e) > 9;

    if (!episideIsTwoDigit) formatting.push([`${s}x0${e}`]);
    if (!seasonIsTwoDigit && !episideIsTwoDigit) {
      formatting.push([`s0${s}e0${e}`]);
      formatting.push([`s0${s}`, `e0${e}`]);
    }
    if (seasonIsTwoDigit && !episideIsTwoDigit) {
      formatting.push([`s${s}e0${e}`]);
      formatting.push([`s${s}`, `e0${e}`]);
    }
    if (!seasonIsTwoDigit && episideIsTwoDigit) {
      formatting.push([`s0${s}e${e}`]);
      formatting.push([`s0${s}`, `e${e}`]);
    }

    q += ` and (${formatting
      .map(
        (format) =>
          `(${format.map((f) => `name contains '${f}'`).join(" and ")})`
      )
      .join(" or ")})`;
  }

  return q;
}

function getSize(size) {
  var gb = 1024 * 1024 * 1024;
  var mb = 1024 * 1024;

  return (
    "💾 " +
    (size / gb > 1
      ? `${(size / gb).toFixed(2)} GB`
      : `${(size / mb).toFixed(2)} MB`)
  );
}

function getQuality(name) {
  name = name.toLowerCase();

  if (["2160", "4k", "uhd"].filter((x) => name.includes(x)).length > 0)
    return "4k";
  if (["1080", "fhd"].filter((x) => name.includes(x)).length > 0) return "FHD";
  if (["720", "hd"].filter((x) => name.includes(x)).length > 0) return "HD";
  if (["480p", "380p", "sd"].filter((x) => name.includes(x)).length > 0)
    return "SD";
  return "";
}

function getCodec(name) {
  name = name.toLowerCase();

  var codec = "";

  if (name.includes("sdr")) codec += "🌺";
  if (
    ["hevc", "h255", "h.265", "x.265", "x265"].filter((x) => name.includes(x))
      .length > 0
  )
    codec += "🌈 x265 ";

  return codec;
}

function refreshToken() {
  if (
    !credentials.token ||
    parseInt(new Date() - credentials.created) >= 3600 * 1000
  ) {
    return fetch("https://www.googleapis.com/oauth2/v4/token", {
      body: JSON.stringify({
        client_id: credentials["client_id"],
        client_secret: credentials["client_secret"],
        refresh_token: credentials["refresh_token"],
        grant_type: "refresh_token",
      }),
      method: "POST",
    })
      .then((res) => res.json())
      .then((json) => {
        credentials.token = json["access_token"];
        credentials.created = new Date();
      });
  }
}