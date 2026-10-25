import Link from 'next/link'
import { TextPage } from '@/components/layout/TextPage'
import { COMPANY } from '@/lib/company'

// Draft written for the LGPD (Lei 13.709/2018); must be reviewed by a lawyer before launch
export default function PrivacyPage() {
  return (
    <TextPage title="Política de privacidade" subtitle={`Última atualização: ${COMPANY.lastUpdated}`}>
      <p>
        Esta Política explica como {COMPANY.legalName} (CNPJ {COMPANY.cnpj}), responsável pelo {COMPANY.brand}, trata seus dados
        pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail, telefone e senha (guardada apenas de forma criptografada). Se você entrar com o Google, recebemos nome, e-mail e foto do perfil.</li>
        <li><strong>Compras:</strong> endereços de entrega, pedidos, itens comprados, cupons usados e forma de pagamento escolhida. Dados de cartão são tratados pelo provedor de pagamento e não ficam guardados conosco.</li>
        <li><strong>Uso da plataforma:</strong> interesses escolhidos, vendedores que você segue, favoritos, lances, votos em enquetes, mensagens no chat e avaliações.</li>
        <li><strong>Vendedores:</strong> produtos, imagens enviadas, lives agendadas e dados necessários para repasses e emissão de notas.</li>
        <li><strong>Técnicos:</strong> endereço IP, navegador e datas de acesso, registrados nas sessões de login.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e permitir o login (execução de contrato).</li>
        <li>Processar pedidos, pagamentos e entregas e prestar atendimento (execução de contrato).</li>
        <li>Enviar avisos sobre pedidos, lances e lives de quem você segue (execução de contrato e legítimo interesse).</li>
        <li>Personalizar as recomendações a partir dos seus interesses (legítimo interesse).</li>
        <li>Prevenir fraudes e garantir a segurança (legítimo interesse).</li>
        <li>Cumprir obrigações legais, como fiscais e o Marco Civil da Internet (obrigação legal).</li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li><strong>Vendedores:</strong> nome, endereço e telefone de entrega dos pedidos feitos com eles.</li>
        <li><strong>Infraestrutura:</strong> Cloudflare, que hospeda o site, o banco de dados e as imagens.</li>
        <li><strong>Login com Google:</strong> Google, se você escolher essa opção.</li>
        <li><strong>Consulta de CEP:</strong> ao digitar um CEP, seu navegador consulta o serviço público ViaCEP.</li>
        <li><strong>Pagamentos e entregas:</strong> provedores de pagamento e transportadoras, na medida do necessário.</li>
        <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial.</li>
      </ul>
      <p>Não vendemos seus dados pessoais.</p>

      <h2>4. Transferência internacional</h2>
      <p>
        Alguns provedores podem armazenar dados fora do Brasil. Nesses casos, adotamos as salvaguardas previstas no art. 33 da LGPD.
      </p>

      <h2>5. Cookies e armazenamento local</h2>
      <p>
        Usamos cookies essenciais para manter você conectado e o armazenamento local do navegador para guardar o carrinho.
        Não usamos cookies de publicidade.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto sua conta estiver ativa. Depois, guardamos apenas o que a lei exige, como registros de acesso
        (6 meses, Marco Civil da Internet) e dados de pedidos para fins fiscais e de defesa de direitos (até 5 anos).
      </p>

      <h2>7. Seus direitos</h2>
      <p>Pelo art. 18 da LGPD, você pode pedir a qualquer momento:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos ou desatualizados (muitos podem ser alterados em <Link href="/settings">Configurações</Link>);</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>portabilidade dos dados;</li>
        <li>informações sobre com quem compartilhamos;</li>
        <li>exclusão da conta e revogação de consentimentos.</li>
      </ul>
      <p>Para exercer esses direitos, escreva para o encarregado. Você também pode reclamar à ANPD.</p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexões criptografadas (HTTPS), senhas protegidas por hash e controle de acesso aos dados. Nenhum sistema é
        totalmente imune a incidentes; se ocorrer algum que gere risco relevante, avisaremos você e a ANPD.
      </p>

      <h2>9. Crianças e adolescentes</h2>
      <p>A plataforma não é destinada a menores de 18 anos sem autorização dos responsáveis.</p>

      <h2>10. Encarregado (DPO)</h2>
      <p>
        {COMPANY.dpoName} — {COMPANY.dpoEmail}
      </p>

      <h2>11. Alterações</h2>
      <p>Podemos atualizar esta Política. A data no topo indica a versão em vigor.</p>
    </TextPage>
  )
}
