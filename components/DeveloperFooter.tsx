import Image from "next/image";

// Assinatura discreta de autoria exibida em todas as páginas do projeto.
export function DeveloperFooter() {
  return (
    <footer className="developer-footer">
      <span>Desenvolvido por</span>
      <Image src="/devmendes.png" alt="DevMendes Desenvolvimento Web" width={300} height={122} />
    </footer>
  );
}
