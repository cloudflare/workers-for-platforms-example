// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { ResourceValues } from "./types";

function ResourceValueToString(value: ResourceValues) {
  return value?.toString() ?? 'null';
}

export function BuildTable(name: string, dataRows: Record<string, string | number | boolean | null>[] | undefined): string {
  const container = (value: ResourceValues) => `<div class="dataContainer"><h3>${name}</h3>${ResourceValueToString(value)}</div>`;
  if (!dataRows?.length) { return container('no data'); }
  const columns = Object.keys(dataRows[0]);
  const makeColumnsHead = (values: ResourceValues[]) => values.map(value => `<th>${ResourceValueToString(value)}</th>`).join('');
  const makeColumnsData = (values: ResourceValues[]) => values.map(value => `<td>${ResourceValueToString(value)}</td>`).join('');
  const makeRow = (value: ResourceValues) => `<tr>${ResourceValueToString(value)}</tr>`;
  const table = `<table class="dataTable">${[
      makeRow(makeColumnsHead(columns)),
      dataRows.map(value => makeRow(makeColumnsData(Object.values(value)))).join('')
    ].join('')}</table>`;
  return container(table);
}

export const CSS = `
html {
  font-family: sans-serif;
}

body {
  padding: 10px;
}

.header {
  padding-bottom: 10px;
}

hr.solid {
  border-top: 3px solid #bbb;
}

.dataContainer {
  padding: 0 0 5 0;
  max-width: 800px;
}

.dataTable {
  border-collapse: collapse;
  width: 100%;
}

.dataTable td, .dataTable th {
  border: 1px solid #ddd;
  padding: 8px;
}

.dataTable tr:nth-child(even) { background-color: #f2f2f2; }

.dataTable tr:hover { background-color: #ddd; }

.dataTable th {
  padding: 12 0 12 0;
  text-align: left;
  background-color: #f4801f;
  color: white;
}
`

export const HtmlPage = (body: string) => `
<!DOCTYPE html><html>
<head><style>${CSS}</style></head>
<body>
<div class="header">
  <h1>Workers for Platforms Example Project</h1>
  <a href="/">admin portal</a>
  &nbsp;|&nbsp; 
  <a href="/upload">customer portal</a>
  <br /><br />
  <div>
    <input type="text" id="scriptUri" placeholder="script name">
    <button onclick="location.href='dispatch/' + document.getElementById('scriptUri').value">Go to script</button>
    (simulates eyeball)
  </div>
</div>
${body}
</body>
</html>
`;

export const UploadPage = `
<hr class="solid">
<h3>Customer Script Upload</h3>
<label for="token"><b>Customer Token</b></label>
<input type="text" id="token" value="a1b2c3"></input>

<br /><br />

<button onclick="getScripts()">Get scripts</button>

<br /><br />

<label for="scriptName"><b>Script Name</b></label>
<input type="text" id="scriptName" value="my-script"></input>

<br /><br />

<label for="scriptContents"><b>Script Contents</b></label>
<br />
<textarea id="scriptContents" name="scriptContents" rows="10" cols="50">
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
})

async function handleRequest(request) {
  return new Response("Hello world");
}
</textarea>

<br /><br />

<button onclick="upload()">Upload script</button>

<br /><br />

<h3>API Reponse</h3>
<div id="response">no request sent yet</div>

<script>
  const responseDiv = document.querySelector("#response");

  async function upload() {
    const token = document.querySelector("#token").value;
    const scriptName = document.querySelector("#scriptName").value;
    const scriptContents = document.querySelector("#scriptContents").value;

    responseDiv.innerHTML = "uploading..."

    const response = await fetch("/script/" + scriptName, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Customer-Token": token },
      body: JSON.stringify({ "script": scriptContents })
    });

    responseDiv.innerHTML = await response.text();
  }

  async function getScripts() {
    const token = document.querySelector("#token").value;

    responseDiv.innerHTML = "fetching..."

    const response = await fetch("/script", {
      method: "GET",
      headers: { "X-Customer-Token": token }
    });

    responseDiv.innerHTML = await response.text();
  }
</script>
`
