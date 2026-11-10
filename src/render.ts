// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { ResourceValues } from './types';

function ResourceValueToString(value: ResourceValues) {
  return value?.toString() ?? 'null';
}

export function BuildTable(name: string, dataRows: Record<string, string | number | boolean | null>[] | undefined): string {
  const container = (value: ResourceValues) => `<div class="dataContainer"><h3>${name}</h3>${ResourceValueToString(value)}</div>`;
  if (!dataRows?.length) {
    return container('no data');
  }
  const columns = Object.keys(dataRows[0]);
  const makeColumnsHead = (values: ResourceValues[]) => values.map((value) => `<th>${ResourceValueToString(value)}</th>`).join('');
  const makeColumnsData = (values: ResourceValues[]) => values.map((value) => `<td>${ResourceValueToString(value)}</td>`).join('');
  const makeRow = (value: ResourceValues) => `<tr>${ResourceValueToString(value)}</tr>`;
  const table = `<table class="dataTable">${[
    makeRow(makeColumnsHead(columns)),
    dataRows.map((value) => makeRow(makeColumnsData(Object.values(value)))).join(''),
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
`;

export const renderPage = (body: string) => `
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

<button onclick="setScripts()">Get scripts</button>

<br /><br />

<label for="scriptName"><b>Script Name</b></label>
<input type="text" id="scriptName" value="my-script"></input>

<br /><br />

<label for="scriptContents"><b>Script Contents</b></label>
<br />
<textarea id="scriptContents" name="scriptContents" rows="10" cols="50">
import { platformThing } from "./platform_module.mjs";
export default {
  async fetch(request, env, ctx) {
    return new Response("Hello! " + platformThing);
  }
};
</textarea>
<div>
  <input type="number" id="cpuMsDispatchLimit" placeholder="cpu limit (ms)">
  <input type="number" id="memoryDispatchLimit" placeholder="memory limit">
</div>
<br /><br />

<div>
  <label for="outboundWorker"><b>Outbound Worker</b></label>
  <select id="outbound_selector" name="outbound_worker">
    <option value=''>Select a worker</option>
  </select>
</div>

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
    const cpuMs = document.getElementById('cpuMsDispatchLimit')?.value;
    const memory = document.getElementById('memoryDispatchLimit')?.value;
    const dispatchLimits = { cpuMs, memory };
    const outboundWorker = document.getElementById('outbound_selector').value;
    responseDiv.innerHTML = "uploading..."
    const response = await fetch("/script/" + scriptName, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Customer-Token": token },
      body: JSON.stringify({ "script": scriptContents, "dispatch_config": { "limits": dispatchLimits, "outbound": outboundWorker } })
    });

    responseDiv.innerHTML = await response.text();
  }

  async function getScripts() {
    const token = document.querySelector("#token").value;
    const response = await fetch("/script", {
      method: "GET",
      headers: { "X-Customer-Token": token }
    });
    return response;
  }

  async function setScripts() {
    responseDiv.innerHTML = "fetching...";
    const response = await getScripts();
    responseDiv.innerHTML = await response.text();
  }

  async function setScriptsInSelector() {
    const selector = document.getElementById("outbound_selector");
    const response = await getScripts();
    const data = await response.json();
    data.map((script) => {
      var option = document.createElement("option");
      option.text = script.id;
      selector.add(option);
    });
  }

  window.addEventListener("load", (event) => {
    setScriptsInSelector();
  });

</script>
`;
