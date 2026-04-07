import React from 'react';
import { Package, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function CartazRequisicao() {
  const linkRequisicao = window.location.origin + '/requisicao-estoque';

  function imprimirCartaz() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Botão de Impressão - não aparece na impressão */}
      <div className="max-w-4xl mx-auto mb-6 no-print">
        <button
          onClick={imprimirCartaz}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Cartaz
        </button>
      </div>

      {/* Cartaz para Impressão */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-12 print:shadow-none">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Requisição de Material
          </h1>
          <p className="text-xl text-gray-600">
            Solicite itens do estoque de forma rápida e fácil
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mb-10 p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
          <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
            <QRCodeSVG
              value={linkRequisicao}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">
            Aponte a câmera do celular para o QR Code
          </p>
          <p className="text-sm text-gray-500 text-center max-w-md">
            Ou acesse diretamente:
          </p>
          <div className="mt-3 px-6 py-3 bg-white rounded-lg border-2 border-blue-200">
            <code className="text-blue-600 font-mono text-sm break-all">
              {linkRequisicao}
            </code>
          </div>
        </div>

        {/* Como Funciona */}
        <div className="space-y-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
            Como Funciona?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">1. Acesse o Link</h3>
              <p className="text-sm text-gray-600">
                Escaneie o QR Code ou acesse o link
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">2. Preencha</h3>
              <p className="text-sm text-gray-600">
                Informe seus dados e os itens necessários
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">3. Envie</h3>
              <p className="text-sm text-gray-600">
                Clique em enviar requisição
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-3">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">4. Aguarde</h3>
              <p className="text-sm text-gray-600">
                Estoquista entrará em contato via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Informações Importantes */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-10">
          <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Importante
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Sempre informe seu WhatsApp correto para receber o contato</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Verifique as quantidades disponíveis antes de solicitar</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Guarde o número da requisição para acompanhamento</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Não precisa fazer login - sistema totalmente público!</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm border-t pt-6">
          <p className="mb-2">Sistema de Gestão - Ditado Popular</p>
          <p>Dúvidas? Fale com o administrador do sistema</p>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
