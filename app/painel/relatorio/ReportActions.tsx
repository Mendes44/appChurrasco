"use client";

// Este componente fica no navegador porque somente o navegador pode abrir a
// janela de impressão. As exportações continuam protegidas por rotas do servidor.
export function ReportActions({ eventId }: { eventId:string }) {
  return <div className="report-actions">
    <button className="secondary" type="button" onClick={()=>window.print()}>Imprimir relatório</button>
    <a className="secondary link-button" href={`/api/relatorio-completo/pdf?evento=${eventId}`}>Exportar PDF</a>
    <a className="primary link-button" href={`/api/relatorio-completo/xlsx?evento=${eventId}`}>Exportar Excel</a>
  </div>;
}
