export type Country = {
  code: string
  name: string
  regions: string[]
}

export const COUNTRIES: Country[] = [
  {
    code: 'ES', name: 'España',
    regions: [
      'Andalucía', 'Aragón', 'Asturias', 'Islas Baleares', 'Canarias',
      'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
      'Ceuta', 'Comunidad de Madrid', 'Comunidad Valenciana', 'Extremadura',
      'Galicia', 'La Rioja', 'Melilla', 'Murcia', 'Navarra', 'País Vasco',
    ],
  },
  {
    code: 'AR', name: 'Argentina',
    regions: [
      'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Ciudad de Buenos Aires',
      'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa',
      'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta',
      'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
      'Tierra del Fuego', 'Tucumán',
    ],
  },
  {
    code: 'MX', name: 'México',
    regions: [
      'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
      'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
      'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
      'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
      'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
      'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
      'Yucatán', 'Zacatecas',
    ],
  },
  {
    code: 'CO', name: 'Colombia',
    regions: [
      'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.',
      'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
      'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
      'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
      'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
      'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
      'Valle del Cauca', 'Vaupés', 'Vichada',
    ],
  },
  {
    code: 'CL', name: 'Chile',
    regions: [
      'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
      'Valparaíso', 'Metropolitana de Santiago', "O'Higgins", 'Maule',
      'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
      'Aysén', 'Magallanes',
    ],
  },
  {
    code: 'PE', name: 'Perú',
    regions: [
      'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
      'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
      'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
      'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
      'Tumbes', 'Ucayali',
    ],
  },
  {
    code: 'UY', name: 'Uruguay',
    regions: [
      'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno',
      'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo',
      'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José',
      'Soriano', 'Tacuarembó', 'Treinta y Tres',
    ],
  },
  {
    code: 'PY', name: 'Paraguay',
    regions: [
      'Alto Paraguay', 'Alto Paraná', 'Amambay', 'Asunción', 'Boquerón',
      'Caaguazú', 'Caazapá', 'Canindeyú', 'Central', 'Concepción',
      'Cordillera', 'Guairá', 'Itapúa', 'Misiones', 'Ñeembucú',
      'Paraguarí', 'Presidente Hayes', 'San Pedro',
    ],
  },
  {
    code: 'BO', name: 'Bolivia',
    regions: [
      'Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro',
      'Pando', 'Potosí', 'Santa Cruz', 'Tarija',
    ],
  },
  {
    code: 'EC', name: 'Ecuador',
    regions: [
      'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi',
      'El Oro', 'Esmeraldas', 'Galápagos', 'Guayas', 'Imbabura', 'Loja',
      'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana',
      'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas',
      'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe',
    ],
  },
  {
    code: 'VE', name: 'Venezuela',
    regions: [
      'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
      'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
      'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
      'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia',
    ],
  },
  {
    code: 'CR', name: 'Costa Rica',
    regions: [
      'Alajuela', 'Cartago', 'Guanacaste', 'Heredia', 'Limón',
      'Puntarenas', 'San José',
    ],
  },
  {
    code: 'PA', name: 'Panamá',
    regions: [
      'Bocas del Toro', 'Chiriquí', 'Coclé', 'Colón', 'Darién',
      'Emberá-Wounaan', 'Guna Yala', 'Herrera', 'Los Santos',
      'Ngäbe-Buglé', 'Panamá', 'Panamá Oeste', 'Veraguas',
    ],
  },
  {
    code: 'GT', name: 'Guatemala',
    regions: [
      'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula',
      'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango',
      'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango',
      'Quiché', 'Retalhuleu', 'Sacatepéquez', 'San Marcos',
      'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
    ],
  },
  {
    code: 'HN', name: 'Honduras',
    regions: [
      'Atlántida', 'Choluteca', 'Colón', 'Comayagua', 'Copán',
      'Cortés', 'El Paraíso', 'Francisco Morazán', 'Gracias a Dios',
      'Intibucá', 'Islas de la Bahía', 'La Paz', 'Lempira',
      'Ocotepeque', 'Olancho', 'Santa Bárbara', 'Valle', 'Yoro',
    ],
  },
  {
    code: 'NI', name: 'Nicaragua',
    regions: [
      'Boaco', 'Carazo', 'Chinandega', 'Chontales', 'Estelí',
      'Granada', 'Jinotega', 'León', 'Madriz', 'Managua',
      'Masaya', 'Matagalpa', 'Nueva Segovia', 'Río San Juan', 'Rivas',
      'Costa Caribe Norte', 'Costa Caribe Sur',
    ],
  },
  {
    code: 'SV', name: 'El Salvador',
    regions: [
      'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán',
      'La Libertad', 'La Paz', 'La Unión', 'Morazán',
      'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana',
      'Sonsonate', 'Usulután',
    ],
  },
  {
    code: 'DO', name: 'República Dominicana',
    regions: [
      'Azua', 'Bahoruco', 'Barahona', 'Dajabón', 'Distrito Nacional',
      'Duarte', 'El Seibo', 'Elías Piña', 'Espaillat', 'Hato Mayor',
      'Hermanas Mirabal', 'Independencia', 'La Altagracia', 'La Romana',
      'La Vega', 'María Trinidad Sánchez', 'Monseñor Nouel', 'Monte Cristi',
      'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná',
      'San Cristóbal', 'San José de Ocoa', 'San Juan',
      'San Pedro de Macorís', 'Sánchez Ramírez', 'Santiago',
      'Santiago Rodríguez', 'Santo Domingo', 'Valverde',
    ],
  },
  {
    code: 'CU', name: 'Cuba',
    regions: [
      'Artemisa', 'Camagüey', 'Ciego de Ávila', 'Cienfuegos', 'Granma',
      'Guantánamo', 'Holguín', 'Isla de la Juventud', 'La Habana',
      'Las Tunas', 'Matanzas', 'Mayabeque', 'Pinar del Río',
      'Sancti Spíritus', 'Santiago de Cuba', 'Villa Clara',
    ],
  },
  {
    code: 'PR', name: 'Puerto Rico',
    regions: [
      'Aguadilla', 'Arecibo', 'Bayamón', 'Caguas', 'Carolina',
      'Guaynabo', 'Humacao', 'Mayagüez', 'Ponce', 'San Juan',
      'Trujillo Alto',
    ],
  },
]

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code)
}
