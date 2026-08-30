/**
 * Tarifa publicada por el proveedor para un modelo concreto (IA-006).
 *
 * Se expresa POR MILLON DE TOKENS porque es la unidad en la que los
 * proveedores publican sus precios: convertirla aqui obligaria a redondear
 * antes de tiempo y a arrastrar el error en cada ejecucion.
 *
 * Entrada y salida se declaran por separado porque se tarifan por separado.
 * Ambas son obligatorias en una tarifa: una tarifa a medias no permite
 * calcular un coste, y calcularlo con la mitad del dato seria inventarlo.
 */
export interface ProviderModelRate {
  /** Identificador exacto del modelo, tal como lo devuelve el proveedor. */
  readonly model: string
  readonly inputPricePerMillionTokens: number
  readonly outputPricePerMillionTokens: number
  /** Moneda en la que estan expresados ambos precios. */
  readonly currency: string
  /**
   * Unidad en la que se expresan los precios. Explicita por contrato: una
   * tarifa sin unidad declarada no es interpretable, y suponerla seria la
   * clase de error que multiplica un coste por un millon.
   */
  readonly pricingUnit: 'PER_MILLION_TOKENS'
  /**
   * Fecha desde la que rige esta tarifa (ISO 8601). Los proveedores cambian
   * precios; sin vigencia, un coste calculado hoy y otro calculado el mes
   * pasado serian indistinguibles aunque procedan de tarifas distintas.
   * Opcional mientras el catalogo no tenga historico.
   */
  readonly effectiveFrom?: string
}

/**
 * Entrada del catalogo oficial de proveedores.
 *
 * `rates` es OPCIONAL y hoy no lo rellena nadie: los precios reales son
 * contenido del catalogo, y el catalogo es "propiedad exclusiva de
 * Direccion -- su contenido se incorpora, retira o modifica mediante
 * actualizacion aprobada por Direccion" (Decision de Direccion, Punto 6).
 * IA-006 aporta el MECANISMO para tarificar; las cifras las aporta
 * Direccion. Sin tarifa declarada no se calcula ningun coste monetario:
 * no se estima, no se aproxima y no se copia de ninguna parte.
 */
export interface ProviderCatalogEntry {
  readonly id: string
  readonly name: string
  readonly rates?: readonly ProviderModelRate[]
}
