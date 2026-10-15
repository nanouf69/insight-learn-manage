/**
 * Protection React contre les modifications du DOM faites hors de React
 * (traduction automatique, extensions) : « removeChild/insertBefore … not a
 * child » / Safari « The object can not be found here ».
 * Idempotente : une seule installation par prototype.
 */
const MARK = "__ftransportDomPatch";

export function installDomPatch(proto: typeof Node.prototype = Node.prototype): void {
  const p = proto as any;
  if (p[MARK]) return;
  p[MARK] = true;
  const origRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn("[DOM Patch] removeChild: node not a child, skipping");
      return child;
    }
    return origRemoveChild.call(this, child) as T;
  };
  const origInsertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, newNode: T, refNode: Node | null): T {
    if (refNode && refNode.parentNode !== this) {
      console.warn("[DOM Patch] insertBefore: reference node not a child, appending");
      return origInsertBefore.call(this, newNode, null) as T;
    }
    return origInsertBefore.call(this, newNode, refNode) as T;
  };
}
