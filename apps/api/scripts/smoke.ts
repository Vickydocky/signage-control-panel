/**
 * Smoke test end-to-end terhadap API yang sedang berjalan (butuh Supabase asli).
 * Pakai:  npm run dev:api   (terminal 1)
 *         npm run smoke -w @signage/api   (terminal 2)
 * Opsional: BASE_URL=http://localhost:4000
 */
const BASE = process.env.BASE_URL ?? "http://localhost:4000";

// PNG 1x1 transparan
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let passed = 0;
let failed = 0;

async function call(
  method: string,
  path: string,
  body?: unknown,
  init: RequestInit = {},
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers:
      body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.log(
      `  \u2717 ${name}`,
      extra !== undefined ? JSON.stringify(extra) : "",
    );
  }
}

async function main() {
  console.log(`Smoke test -> ${BASE}\n`);

  console.log("Health");
  const health = await call("GET", "/health");
  check(
    "GET /health = 200 & database up",
    health.status === 200 && health.json?.database === "up",
    health,
  );
  if (health.status !== 200) {
    console.log("\nDatabase tidak terjangkau, hentikan test.");
    process.exit(1);
  }

  console.log("\nDevices");
  const bad = await call("POST", "/api/devices", { nama: "" });
  check(
    "POST invalid body = 400 VALIDATION_ERROR",
    bad.status === 400 && bad.json?.error?.code === "VALIDATION_ERROR",
    bad,
  );

  const created = await call("POST", "/api/devices", {
    nama: "Smoke Device",
    lokasi: "Lab",
  });
  const dev = created.json;
  check(
    "POST /api/devices = 201 + device_token",
    created.status === 201 && typeof dev?.device_token === "string",
    created,
  );
  check("new device status = offline", dev?.status === "offline");

  const list = await call("GET", "/api/devices?q=Smoke&pageSize=5");
  check(
    "GET list filter q",
    list.status === 200 && list.json.data.some((d: any) => d.id === dev.id),
    list,
  );
  check(
    "list does NOT leak device_token",
    list.json.data.every((d: any) => !("device_token" in d)),
  );

  const one = await call("GET", `/api/devices/${dev.id}`);
  check(
    "GET /api/devices/:id",
    one.status === 200 && one.json.device_token === dev.device_token,
    one,
  );

  const patched = await call("PATCH", `/api/devices/${dev.id}`, {
    lokasi: "Lantai 3",
  });
  check(
    "PATCH lokasi",
    patched.status === 200 && patched.json.lokasi === "Lantai 3",
    patched,
  );

  const rot = await call("POST", `/api/devices/${dev.id}/regenerate-token`);
  check(
    "regenerate-token gives a new token",
    rot.status === 200 && rot.json.device_token !== dev.device_token,
    rot,
  );

  const notFound = await call(
    "GET",
    "/api/devices/00000000-0000-4000-8000-000000000000",
  );
  check("GET unknown id = 404", notFound.status === 404, notFound);
  const badId = await call("GET", "/api/devices/not-a-uuid");
  check("GET malformed id = 400", badId.status === 400, badId);

  console.log("\nContents");
  const text = await call("POST", "/api/contents", {
    judul: "Smoke Text",
    tipe: "text",
    payload: "Hello signage",
  });
  check("POST text content = 201", text.status === 201, text);

  const badUrl = await call("POST", "/api/contents", {
    judul: "Bad",
    tipe: "url",
    payload: "javascript:alert(1)",
  });
  check("POST url with non-http scheme = 400", badUrl.status === 400, badUrl);

  const edit = await call("PATCH", `/api/contents/${text.json.id}`, {
    payload: "Updated text",
  });
  check(
    "PATCH text payload",
    edit.status === 200 && edit.json.payload === "Updated text",
    edit,
  );

  const form = new FormData();
  form.append("judul", "Smoke Image");
  form.append("file", new Blob([PNG_1X1], { type: "image/png" }), "pixel.png");
  const up = await call("POST", "/api/contents/upload", undefined, {
    method: "POST",
    body: form,
  });
  check(
    "POST /contents/upload png = 201 (image)",
    up.status === 201 && up.json?.tipe === "image" && !!up.json?.storage_path,
    up,
  );

  if (up.json?.payload) {
    const pub = await fetch(up.json.payload);
    check(
      "uploaded file is publicly reachable",
      pub.status === 200,
      pub.status,
    );
  }

  const badForm = new FormData();
  badForm.append("file", new Blob(["hello"], { type: "text/plain" }), "x.txt");
  const bad415 = await call("POST", "/api/contents/upload", undefined, {
    method: "POST",
    body: badForm,
  });
  check("upload text/plain = 415", bad415.status === 415, bad415);

  const editUpload = await call("PATCH", `/api/contents/${up.json?.id}`, {
    payload: "https://example.com/x.png",
  });
  check(
    "editing payload of uploaded file = 400",
    editUpload.status === 400,
    editUpload,
  );

  const contents = await call("GET", "/api/contents?tipe=image&pageSize=5");
  check(
    "GET contents filter tipe",
    contents.status === 200 &&
      contents.json.data.every((c: any) => c.tipe === "image"),
    contents,
  );

  console.log("\nCleanup");
  const delImg = await call("DELETE", `/api/contents/${up.json?.id}`);
  check("DELETE uploaded content = 204", delImg.status === 204, delImg);
  if (up.json?.payload) {
    const gone = await fetch(up.json.payload);
    check(
      "storage object removed after delete",
      gone.status !== 200,
      gone.status,
    );
  }
  check(
    "DELETE text content = 204",
    (await call("DELETE", `/api/contents/${text.json.id}`)).status === 204,
  );
  check(
    "DELETE device = 204",
    (await call("DELETE", `/api/devices/${dev.id}`)).status === 204,
  );
  check(
    "device is gone (404)",
    (await call("GET", `/api/devices/${dev.id}`)).status === 404,
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
