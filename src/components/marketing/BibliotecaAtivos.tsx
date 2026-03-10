import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Search,
  Filter,
  Image as ImageIcon,
  Video,
  File,
  Tag,
  Download,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface Ativo {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'imagem' | 'video' | 'gif' | 'documento' | 'audio';
  formato: string;
  url: string;
  thumbnail_url: string;
  tamanho_bytes: number;
  largura: number;
  altura: number;
  tags: string[];
  versao: number;
  uso_contagem: number;
  created_at: string;
  created_by: string;
}

const tipoIcons = {
  imagem: ImageIcon,
  video: Video,
  gif: ImageIcon,
  documento: File,
  audio: File
};

const BibliotecaAtivos: React.FC = () => {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [selectedAtivo, setSelectedAtivo] = useState<Ativo | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAtivos();
  }, []);

  const fetchAtivos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ativos_marketing')
        .select('*')
        .order('created_at', { ascending: false });

      if (tipoFiltro !== 'todos') {
        query = query.eq('tipo', tipoFiltro);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAtivos(data || []);
    } catch (error) {
      console.error('Erro ao carregar ativos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtivos();
  }, [tipoFiltro]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('marketing-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('marketing-assets')
          .getPublicUrl(filePath);

        const tipo = file.type.startsWith('image/')
          ? file.type === 'image/gif'
            ? 'gif'
            : 'imagem'
          : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
          ? 'audio'
          : 'documento';

        const { error: dbError } = await supabase
          .from('ativos_marketing')
          .insert({
            nome: file.name,
            tipo,
            formato: fileExt,
            url: urlData.publicUrl,
            thumbnail_url: tipo === 'imagem' || tipo === 'gif' ? urlData.publicUrl : null,
            tamanho_bytes: file.size,
            tags: [],
            versao: 1,
            created_by: user?.id || null
          });

        if (dbError) throw dbError;
      }

      await fetchAtivos();
      alert('Upload realizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAtivo = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este ativo?')) return;

    try {
      const { error } = await supabase
        .from('ativos_marketing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAtivos();
      setSelectedAtivo(null);
    } catch (error) {
      console.error('Erro ao deletar ativo:', error);
      alert('Erro ao deletar ativo');
    }
  };

  const filteredAtivos = ativos.filter(ativo =>
    searchTerm === '' || ativo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ativos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="todos">Todos os tipos</option>
          <option value="imagem">Imagens</option>
          <option value="video">Vídeos</option>
          <option value="gif">GIFs</option>
          <option value="documento">Documentos</option>
          <option value="audio">Áudios</option>
        </select>

        <button
          onClick={handleFileSelect}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          {uploading ? 'Enviando...' : 'Upload'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando ativos...</p>
        </div>
      ) : filteredAtivos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Nenhum ativo encontrado</p>
          <button
            onClick={handleFileSelect}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Fazer primeiro upload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAtivos.map(ativo => {
            const Icon = tipoIcons[ativo.tipo];
            return (
              <div
                key={ativo.id}
                className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedAtivo(ativo)}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {ativo.thumbnail_url ? (
                    <img
                      src={ativo.thumbnail_url}
                      alt={ativo.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ativo.nome}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatFileSize(ativo.tamanho_bytes)}
                    </span>
                    <span className="text-xs text-gray-500">
                      v{ativo.versao}
                    </span>
                  </div>
                  {ativo.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {ativo.tags.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAtivo(ativo);
                    }}
                    className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAtivo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedAtivo.nome}
                  </h2>
                  {selectedAtivo.descricao && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedAtivo.descricao}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAtivo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                {selectedAtivo.tipo === 'imagem' || selectedAtivo.tipo === 'gif' ? (
                  <img
                    src={selectedAtivo.url}
                    alt={selectedAtivo.nome}
                    className="w-full rounded-lg"
                  />
                ) : selectedAtivo.tipo === 'video' ? (
                  <video
                    src={selectedAtivo.url}
                    controls
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                    <File className="w-24 h-24 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedAtivo.tipo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Formato</label>
                  <p className="mt-1 text-sm text-gray-900 uppercase">{selectedAtivo.formato}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tamanho</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatFileSize(selectedAtivo.tamanho_bytes)}
                  </p>
                </div>
                {selectedAtivo.largura && selectedAtivo.altura && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Dimensões</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAtivo.largura} x {selectedAtivo.altura}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Versão</label>
                  <p className="mt-1 text-sm text-gray-900">v{selectedAtivo.versao}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Usado</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAtivo.uso_contagem} {selectedAtivo.uso_contagem === 1 ? 'vez' : 'vezes'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Criado em</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {dayjs(selectedAtivo.created_at).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
              </div>

              {selectedAtivo.tags.length > 0 && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAtivo.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => handleDeleteAtivo(selectedAtivo.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Deletar
              </button>
              <div className="flex gap-3">
                <a
                  href={selectedAtivo.url}
                  download
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={() => setSelectedAtivo(null)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BibliotecaAtivos;
