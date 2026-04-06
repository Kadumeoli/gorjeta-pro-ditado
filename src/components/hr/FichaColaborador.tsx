import React, { useRef } from 'react';
import {
  X,
  User,
  Calendar,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  FileText,
  Download,
  Printer
} from 'lucide-react';
import dayjs from 'dayjs';

interface FichaColaboradorProps {
  colaborador: any;
  onClose: () => void;
}

const FichaColaborador: React.FC<FichaColaboradorProps> = ({ colaborador, onClose }) => {
  const fichaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!fichaRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(fichaRef.current, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Ficha_${colaborador.nome_completo}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF da ficha');
    }
  };

  const calcularTempoEmpresa = () => {
    if (!colaborador.data_admissao) return 'N/A';
    const admissao = dayjs(colaborador.data_admissao);
    const hoje = dayjs();
    const anos = hoje.diff(admissao, 'year');
    const meses = hoje.diff(admissao.add(anos, 'year'), 'month');

    if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    if (meses === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:relative print:inset-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none">
        {/* Header - Esconder na impressão */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold text-white/90">Ficha do Colaborador</h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Baixar PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo da Ficha */}
        <div ref={fichaRef} className="p-8 print:p-12">
          {/* Cabeçalho da Empresa */}
          <div className="text-center mb-8 border-b-2 border-slate-200 pb-6">
            <h1 className="text-2xl font-bold text-white/90 mb-2">FICHA DE COLABORADOR</h1>
            <p className="text-slate-600">Dados Cadastrais e Profissionais</p>
          </div>

          {/* Foto e Dados Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Foto */}
            <div className="flex flex-col items-center">
              <div className="w-40 h-48 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-300 mb-3">
                {colaborador.foto_url ? (
                  <img
                    src={colaborador.foto_url}
                    alt={colaborador.nome_completo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-20 h-20 text-slate-400" />
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">3x4</p>
              </div>
            </div>

            {/* Dados Principais */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Nome Completo</label>
                <p className="text-lg font-bold text-white/90">{colaborador.nome_completo}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
                  <p className="text-white/90">{colaborador.cpf || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">RG</label>
                  <p className="text-white/90">{colaborador.rg || 'Não informado'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Data de Nascimento</label>
                <p className="text-white/90">
                  {colaborador.data_nascimento
                    ? dayjs(colaborador.data_nascimento).format('DD/MM/YYYY')
                    : 'Não informado'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                  colaborador.status === 'ativo' ? 'bg-green-100 text-green-800' :
                  colaborador.status === 'inativo' ? 'bg-slate-100 text-white/90' :
                  colaborador.status === 'afastado' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {colaborador.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Dados Profissionais */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Dados Profissionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Função/Cargo</label>
                <p className="text-white/90 font-medium">
                  {colaborador.funcao_nome || colaborador.funcao_personalizada || 'Não informado'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Tipo de Vínculo</label>
                <p className="text-white/90">
                  {colaborador.tipo_vinculo === 'clt' ? 'CLT' :
                   colaborador.tipo_vinculo === 'freelancer' ? 'Freelancer' :
                   colaborador.tipo_vinculo === 'prestador' ? 'Prestador de Serviços' :
                   'Não informado'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Data de Admissão</label>
                <p className="text-white/90">
                  {colaborador.data_admissao
                    ? dayjs(colaborador.data_admissao).format('DD/MM/YYYY')
                    : 'Não informado'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Tempo de Empresa</label>
                <p className="text-white/90 font-medium">{calcularTempoEmpresa()}</p>
              </div>

              {colaborador.data_demissao && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Data de Demissão</label>
                  <p className="text-white/90">
                    {dayjs(colaborador.data_demissao).format('DD/MM/YYYY')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dados Financeiros */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Dados Financeiros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Salário Fixo</label>
                <p className="text-white/90 text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(colaborador.salario_fixo || 0)}
                </p>
              </div>

              {colaborador.valor_diaria > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Valor Diária</label>
                  <p className="text-white/90 font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(colaborador.valor_diaria)}
                  </p>
                </div>
              )}

              {colaborador.percentual_comissao > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Comissão</label>
                  <p className="text-white/90 font-medium">{colaborador.percentual_comissao}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Dados de Contato */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Dados de Contato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Telefone
                </label>
                <p className="text-white/90">{colaborador.telefone || 'Não informado'}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                  <Mail className="w-4 h-4" /> E-mail
                </label>
                <p className="text-white/90">{colaborador.email || 'Não informado'}</p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Endereço
                </label>
                <p className="text-white/90">{colaborador.endereco || 'Não informado'}</p>
              </div>
            </div>
          </div>

          {/* Observações */}
          {colaborador.observacoes && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observações
              </h3>
              <div className="bg-slate-50 p-6 rounded-lg">
                <p className="text-white/80 whitespace-pre-wrap">{colaborador.observacoes}</p>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-12 pt-6 border-t-2 border-slate-200">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="text-xs text-slate-600 text-center">Assinatura do Colaborador</p>
                </div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="text-xs text-slate-600 text-center">Departamento de RH</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-6">
              Documento gerado em {dayjs().format('DD/MM/YYYY HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:bg-white,
          .print\\:bg-white * {
            visibility: visible;
          }
          .print\\:bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default FichaColaborador;
