import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      const result = login(username, password);

      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error);
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-macroplay-blue flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={import.meta.env.LOGO_URL}
            alt="Macroplay Logo"
            className="h-24 md:h-32 mx-auto mb-6 drop-shadow-lg"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Bienvenido
          </h1>
          <p className="text-white/80 text-sm md:text-base">
            Dashboard Administrativo
          </p>
        </div>

        {/* Formulario de Login */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de Usuario */}
            <div>
              <label
                htmlFor="username"
                className="block text-white text-sm font-medium mb-2"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-macroplay-blue placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-macroplay-yellow transition-all"
                placeholder="Ingrese su usuario"
                disabled={isLoading}
                required
              />
            </div>

            {/* Campo de Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="block text-white text-sm font-medium mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-macroplay-blue placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-macroplay-yellow transition-all"
                placeholder="Ingrese su contraseña"
                disabled={isLoading}
                required
              />
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón de Ingresar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-macroplay-yellow text-macroplay-blue font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-macroplay-blue"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          © 2025 Macropay. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
