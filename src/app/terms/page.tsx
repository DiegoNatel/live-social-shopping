import Link from 'next/link'
import { TextPage } from '@/components/layout/TextPage'
import { COMPANY } from '@/lib/company'

// Draft: must be reviewed by a lawyer before launch (see lib/company.ts)
export default function TermsPage() {
  return (
    <TextPage title="Termos de uso" subtitle={`Última atualização: ${COMPANY.lastUpdated}`}>
      <p>
        Estes Termos regulam o uso da plataforma {COMPANY.brand}, operada por {COMPANY.legalName}, CNPJ {COMPANY.cnpj}, com sede em{' '}
        {COMPANY.address}. Ao criar uma conta ou usar a plataforma, você concorda com estes Termos e com a{' '}
        <Link href="/privacy">Política de privacidade</Link>.
      </p>

      <h2>1. O que é o {COMPANY.brand}</h2>
      <p>
        O {COMPANY.brand} é um marketplace de compras ao vivo. Vendedores independentes apresentam produtos em transmissões e
        os compradores podem conversar, participar de enquetes e leilões e comprar pela plataforma. Salvo indicação em contrário,
        o {COMPANY.brand} não é o vendedor dos produtos: atua como intermediador entre comprador e vendedor.
      </p>

      <h2>2. Conta</h2>
      <ul>
        <li>Você precisa ter pelo menos 18 anos, ou autorização dos responsáveis, para criar uma conta e comprar.</li>
        <li>Os dados informados devem ser verdadeiros e mantidos atualizados.</li>
        <li>Você é responsável por manter sua senha em sigilo e pelas ações feitas na sua conta.</li>
        <li>Podemos suspender ou encerrar contas que violem estes Termos ou a lei.</li>
      </ul>

      <h2>3. Compras</h2>
      <ul>
        <li>Preço, frete e descontos são exibidos antes da confirmação do pedido. O valor cobrado é o exibido no resumo.</li>
        <li>O pedido é confirmado após a aprovação do pagamento. Pedidos não pagos no prazo podem ser cancelados.</li>
        <li>Cupons são pessoais, valem uma vez por conta e podem ter regras próprias (validade, valor mínimo, limite de uso).</li>
        <li>O desconto do PIX se aplica somente a pagamentos feitos por PIX.</li>
      </ul>

      <h2>4. Direito de arrependimento, trocas e garantia</h2>
      <p>
        Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias contados do recebimento do
        produto, com devolução integral dos valores pagos, inclusive o frete. Produtos com vício têm a garantia legal prevista no
        CDC, sem prejuízo de garantias adicionais oferecidas pelo vendedor.
      </p>

      <h2>5. Leilões</h2>
      <ul>
        <li>Cada lance é uma oferta de compra vinculante pelo valor ofertado.</li>
        <li>Vence quem tiver o maior lance válido no encerramento. O vencedor deve concluir o pagamento no prazo informado.</li>
        <li>Vendedores não podem dar lances nos próprios leilões.</li>
      </ul>

      <h2>6. Lives, chat e conteúdo</h2>
      <ul>
        <li>É proibido publicar conteúdo ilegal, ofensivo, discriminatório, enganoso ou que viole direitos de terceiros.</li>
        <li>Podemos remover mensagens e conteúdos e restringir contas que descumpram estas regras.</li>
        <li>Ao enviar imagens ou outros conteúdos, você declara ter os direitos necessários e nos autoriza a exibi-los na plataforma.</li>
      </ul>

      <h2>7. Vendedores</h2>
      <ul>
        <li>O vendedor é responsável pela veracidade dos anúncios, pela qualidade e legalidade dos produtos, pela entrega e pela emissão de nota fiscal.</li>
        <li>É proibido anunciar produtos ilegais, falsificados ou de venda restrita.</li>
        <li>Comissões, prazos de repasse e demais condições comerciais constam em termos específicos para vendedores.</li>
      </ul>

      <h2>8. Responsabilidade</h2>
      <p>
        Trabalhamos para manter a plataforma disponível e segura, mas não garantimos funcionamento ininterrupto. Nada nestes Termos
        limita direitos que a lei garante ao consumidor.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Podemos alterar estes Termos. Mudanças relevantes serão comunicadas na plataforma com antecedência razoável. O uso
        continuado após a vigência indica concordância.
      </p>

      <h2>10. Lei e foro</h2>
      <p>
        Estes Termos seguem as leis brasileiras. Fica eleito o foro do domicílio do consumidor; para os demais casos, o foro de{' '}
        {COMPANY.forumCity}.
      </p>

      <h2>Contato</h2>
      <p>{COMPANY.supportEmail}</p>
    </TextPage>
  )
}
