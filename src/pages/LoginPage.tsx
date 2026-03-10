@@ .. @@
           <div className="space-y-4">
             <div>
               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                 Email
               </label>
               <input
                 id="email"
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 placeholder="Digite seu email"
                 required
               />
             </div>

             <div>
               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                 Senha
               </label>
               <input
                 id="password"
                 type="password"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 placeholder="Digite sua senha"
                 required
               />
             </div>

             {error && (
               <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                 {error}
               </div>
             )}

             <button
               type="submit"
               disabled={loading}
               className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               {loading ? 'Entrando...' : 'Entrar'}
             </button>
+
+            {/* Usuários de teste - apenas em desenvolvimento */}
+            {process.env.NODE_ENV === 'development' && (
+              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
+                <h3 className="text-sm font-medium text-gray-700 mb-2">Usuários de Teste:</h3>
+                <div className="space-y-2 text-xs text-gray-600">
+                  <div>
+                    <strong>Gerente:</strong> gerente@ditadopopular.com / qualquer senha
+                  </div>
+                  <div>
+                    <strong>Admin:</strong> admin@ditadopopular.com / qualquer senha
+                  </div>
+                  <div>
+                    <strong>Master:</strong> master@ditadopopular.com / qualquer senha
+                  </div>
+                </div>
+              </div>
+            )}
           </div>
         </form>
       </div>