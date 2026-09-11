import { MinsaAnnouncement } from '../types';

/**
 * Downloads the attached official document of a MINSA announcement.
 * If an attached data URL/file exists, it triggers direct download.
 * Otherwise, generates an authentic official Ministerial document in Word/HTML format.
 */
export const downloadAnnouncementDocument = (announcement: MinsaAnnouncement): void => {
  const fileName = announcement.anexo_nome || `${announcement.numero_oficio.replace(/[^a-zA-Z0-9_-]/g, '_')}_documento_oficial.doc`;

  if (announcement.anexo_url) {
    const link = document.createElement('a');
    link.href = announcement.anexo_url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Generate an official ministerial document (MS Word / HTML compatible)
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>${announcement.numero_oficio} - ${announcement.titulo}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #0b1e3b;
      padding-bottom: 20px;
    }
    .republica {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 0;
      color: #0b1e3b;
    }
    .ministerio {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 5px 0;
      color: #b45309;
    }
    .direccao {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 5px 0 15px 0;
      color: #334155;
    }
    .oficio-badge {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 16px;
      font-family: 'Courier New', Courier, monospace;
      font-weight: bold;
      font-size: 14px;
      color: #0f172a;
      border-radius: 4px;
      margin-top: 10px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12px;
      background-color: #fafafa;
    }
    .meta-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
    }
    .meta-table .label {
      font-weight: bold;
      width: 25%;
      color: #475569;
      background: #f8fafc;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin: 25px 0 20px 0;
      color: #0f172a;
      text-transform: uppercase;
      border-left: 4px solid #b45309;
      padding-left: 12px;
    }
    .summary-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      font-style: italic;
      color: #78350f;
      margin-bottom: 25px;
    }
    .content {
      font-size: 14px;
      text-align: justify;
      white-space: pre-line;
      margin-bottom: 40px;
    }
    .signature-area {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .seal {
      width: 140px;
      height: 140px;
      border: 2px dashed #b45309;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 10px;
      font-weight: bold;
      color: #b45309;
      text-transform: uppercase;
      padding: 10px;
      transform: rotate(-10deg);
    }
    .signature {
      text-align: center;
      width: 320px;
      margin-left: auto;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 60px;
      padding-top: 8px;
      font-weight: bold;
      font-size: 13px;
    }
    .signature-role {
      font-size: 11px;
      color: #475569;
    }
    .footer {
      margin-top: 50px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="republica">República de Angola</div>
    <div class="ministerio">Ministério da Saúde (MINSA)</div>
    <div class="direccao">Direcção Nacional de Medicamentos e Equipamentos (DNME)</div>
    <div class="oficio-badge">${announcement.numero_oficio}</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Categoria:</td>
      <td><strong>${announcement.categoria.replace('_', ' ').toUpperCase()}</strong></td>
      <td class="label">Nível de Prioridade:</td>
      <td><strong>${announcement.prioridade.replace('_', ' ').toUpperCase()}</strong></td>
    </tr>
    <tr>
      <td class="label">Data de Emissão:</td>
      <td>${announcement.data_publicacao}</td>
      <td class="label">Vigência / Prazo:</td>
      <td>${announcement.data_vigencia_fim || 'Indeterminado / Imediato'}</td>
    </tr>
    <tr>
      <td class="label">Âmbito Territorial:</td>
      <td>${announcement.ambito_territorial}</td>
      <td class="label">Destinatários Obrigatórios:</td>
      <td>${announcement.publico_alvo.join(', ').toUpperCase()}</td>
    </tr>
  </table>

  <div class="title">${announcement.titulo}</div>

  <div class="summary-box">
    <strong>Resumo Normativo:</strong> ${announcement.resumo}
  </div>

  <div class="content">
${announcement.conteudo}
  </div>

  <div class="signature-area">
    <div class="seal">
      REPÚBLICA DE ANGOLA<br>MINISTÉRIO DA SAÚDE<br>DNME - HOMOLOGADO DIGITALMENTE
    </div>
    <div class="signature">
      <div class="signature-line">${announcement.signatario}</div>
      <div class="signature-role">${announcement.cargo_signatario || 'Director Nacional DNME / Inspecção de Saúde'}</div>
    </div>
  </div>

  <div class="footer">
    Documento Oficial vinculado à Plataforma Nacional Muti Ku Kwama Saúde • Transmissão Electrónica Autenticada • MINSA Angola
  </div>
</body>
</html>
  `.trim();

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName.replace('.pdf', '.doc') : fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Opens a printable official preview in a new window/tab
 */
export const openOfficialDocumentPrintView = (announcement: MinsaAnnouncement): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>${announcement.numero_oficio} - ${announcement.titulo}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #111;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
    }
    .republica { font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 0; }
    .ministerio { font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 4px 0; }
    .direccao { font-size: 12px; text-transform: uppercase; margin: 4px 0; }
    .badge { font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 10px; }
    .content { text-align: justify; white-space: pre-line; font-size: 13px; line-height: 1.8; margin: 25px 0; }
    .sign { margin-top: 60px; text-align: right; }
    .sign-line { border-top: 1px solid #000; width: 300px; display: inline-block; padding-top: 8px; font-weight: bold; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="republica">República de Angola</div>
    <div class="ministerio">Ministério da Saúde</div>
    <div class="direccao">Direcção Nacional de Medicamentos e Equipamentos (DNME)</div>
    <div class="badge">${announcement.numero_oficio}</div>
  </div>

  <h3 style="text-align: center; text-transform: uppercase; margin-bottom: 20px;">${announcement.titulo}</h3>

  <div class="content">${announcement.conteudo}</div>

  <div class="sign">
    <div class="sign-line">
      ${announcement.signatario}<br>
      <small style="font-weight: normal;">${announcement.cargo_signatario || 'Director Nacional DNME'}</small>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Formats file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
