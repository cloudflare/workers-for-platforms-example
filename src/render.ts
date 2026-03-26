// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

export function renderPage(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Workers for Platforms Example!</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        textarea { width: 100%; height: 200px; margin: 10px 0; }
        input[type="text"] { width: 100%; padding: 8px; margin: 10px 0; }
        button { background: #0066cc; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        button:hover { background: #0052a3; }
        .success { color: green; margin: 10px 0; }
        .error { color: red; margin: 10px 0; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Workers for Platforms Example</h1>
        ${body}
    </div>
</body>
</html>`;
}

export const UploadPage = `
<p><a href="/"><- Back to Homepage</a></p>
<h2>Create a User Worker</h2>
<form id="workerForm">
    <div>
        <label for="workerName">Worker Name:</label>
        <input type="text" id="workerName" name="workerName" value="my-worker" required>
    </div>
    <div>
        <label for="workerCode">Worker Code:</label>
        <textarea id="workerCode" name="workerCode" required>export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || 'World';

    return new Response('Hello ' + name + '! This is a user Worker running on Workers for Platforms.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};</textarea>
    </div>
    <button type="submit">Create Worker</button>
</form>
<div id="result"></div>

<script>
document.getElementById('workerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('workerName');
    const code = formData.get('workerCode');
    const resultDiv = document.getElementById('result');

    try {
        const response = await fetch('/create-worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code })
        });

        if (response.ok) {
            resultDiv.innerHTML = '<div class="success">Worker created successfully! Access it at <a href="/user-workers/' + name + '" target="_blank">/user-workers/' + name + '</a></div>';
            document.getElementById('workerForm').reset();
        } else {
            const error = await response.text();
            resultDiv.innerHTML = '<div class="error">Error: ' + error + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
    }
});
</script>
`;

export function BuildTable(tableName: string, data: Record<string, string | number>[]): string {
  if (!data || data.length === 0) {
    return `<h3>${tableName}</h3><p>No data</p>`;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    '<tr>' + headers.map(header => {
      const value = row[header] || '';
      if (header === 'url' && value) {
        return `<td><a href="${value}" target="_blank">${value}</a></td>`;
      }
      return `<td>${value}</td>`;
    }).join('') + '</tr>'
  ).join('');

  return `
    <h3>${tableName}</h3>
    <table>
      <thead>
        <tr>
          ${headers.map(header => `<th>${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}
