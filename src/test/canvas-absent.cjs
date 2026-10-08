// Environnement de test uniquement : le module natif « canvas » (dépendance facultative de jsdom)
// est présent sans son binaire pour Node 22 (aucune version précompilée), ce qui faisait planter
// jsdom au démarrage. On le déclare « absent » pour jsdom, qui fonctionne alors normalement.
// Aucun effet sur l'application (le navigateur fournit son propre canvas).
const Module = require("module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "canvas") { const e = new Error("canvas désactivé en test"); e.code = "MODULE_NOT_FOUND"; throw e; }
  return orig.call(this, request, ...rest);
};
