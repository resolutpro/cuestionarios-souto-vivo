import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { 
  ArrowLeft, 
  ArrowRight, 
  User, 
  TreePine, 
  Target, 
  CheckCircle, 
  GraduationCap, 
  Users,
  Send,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  nombreApellidos: z.string().min(1, "Nombre requerido"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  localidad: z.string().optional(),
  genero: z.enum(["mujer", "hombre", "otros"]).optional(),
  edad: z.enum(["menos_35", "entre_35_50", "mas_50"]).optional(),
  relacionFinca: z.enum(["propietario", "arrendatario", "gestor", "otra"]).optional(),
  relacionFincaOtra: z.string().optional(),
  titularidadCompartida: z.enum(["si", "no"]).optional(),
  agricultorTituloPrincipal: z.enum(["si", "no_complementario"]).optional(),
  asociacionPertenece: z.string().optional(),
  
  referenciasCatastrales: z.string().optional(),
  superficieCategoria: z.enum(["menos_1ha", "entre_1_5ha", "mas_5ha", "otra", "no_se"]).optional(),
  superficieOtra: z.string().optional(),
  tipoFinca: z.array(z.string()).optional(),
  usoSuelo: z.enum(["cultivo_activo", "pasto", "monte", "sin_uso", "otro"]).optional(),
  usoSueloOtro: z.string().optional(),
  enProduccion: z.boolean().optional(),
  
  acceso: z.enum(["bueno", "regular", "malo"]).optional(),
  agua: z.enum(["si", "no", "no_se"]).optional(),
  pendiente: z.enum(["baja", "media", "alta"]).optional(),
  pedregosidad: z.enum(["baja", "media", "alta"]).optional(),
  
  necesidades: z.array(z.string()).optional(),
  necesidadesOtras: z.string().optional(),
  objetivosModelo: z.array(z.string()).optional(),
  produccionPrincipal: z.array(z.string()).optional(),
  otrosObjetivosTexto: z.string().optional(),
  
  gradoInteres: z.enum(["alto", "medio", "bajo"]).optional(),
  nivelActuacion: z.enum(["solo_diagnostico", "implantacion"]).optional(),
  disponibilidad: z.array(z.string()).optional(),
  relevoGeneracional: z.enum(["si_familiares", "no_riesgo_abandono", "buscando"]).optional(),
  
  formacion: z.array(z.string()).optional(),
  formacionOtro: z.string().optional(),
  
  colaboracion: z.enum(["si_agrupacion", "si_puntuales", "no_individual", "no_se_asesoria"]).optional(),
  minifundio: z.enum(["si_mucho", "si_asumible", "no_adecuado"]).optional(),
  cesionTierras: z.enum(["si_contrato", "si_municipio", "no"]).optional(),
  gobernanzaComunidad: z.array(z.string()).optional(),
  gobernanzaOtro: z.string().optional(),
  
  observaciones: z.string().optional(),
  consentimientoTratamiento: z.boolean().refine(val => val === true, "Debe aceptar el tratamiento de datos"),
  aceptoComunicaciones: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: "Datos Personales", icon: User },
  { id: 2, name: "Información Finca", icon: TreePine },
  { id: 3, name: "Necesidades", icon: Target },
  { id: 4, name: "Interés", icon: CheckCircle },
  { id: 5, name: "Formación", icon: GraduationCap },
  { id: 6, name: "Social", icon: Users },
];

export default function NewSubmissionPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombreApellidos: "",
      telefono: "",
      email: "",
      localidad: "",
      relacionFincaOtra: "",
      asociacionPertenece: "",
      referenciasCatastrales: "",
      superficieOtra: "",
      tipoFinca: [],
      usoSueloOtro: "",
      necesidades: [],
      necesidadesOtras: "",
      objetivosModelo: [],
      produccionPrincipal: [],
      otrosObjetivosTexto: "",
      disponibilidad: [],
      formacion: [],
      formacionOtro: "",
      gobernanzaComunidad: [],
      gobernanzaOtro: "",
      observaciones: "",
      consentimientoTratamiento: false,
      aceptoComunicaciones: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData & { status: string }) => {
      const response = await apiRequest("POST", "/api/submissions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Cuestionario enviado",
        description: "El cuestionario ha sido registrado correctamente.",
      });
      setLocation("/submissions");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el cuestionario. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData, status: "borrador" | "enviado") => {
    submitMutation.mutate({ ...data, status });
  };

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, steps.length));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const CheckboxArrayField = ({ 
    name, 
    options 
  }: { 
    name: keyof FormData; 
    options: { value: string; label: string }[] 
  }) => (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem>
          <div className="space-y-2">
            {options.map((option) => (
              <FormField
                key={option.value}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={(field.value as string[])?.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const currentValue = (field.value as string[]) || [];
                          if (checked) {
                            field.onChange([...currentValue, option.value]);
                          } else {
                            field.onChange(currentValue.filter((v: string) => v !== option.value));
                          }
                        }}
                        data-testid={`checkbox-${name}-${option.value}`}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">{option.label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </FormItem>
      )}
    />
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/submissions">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Cuestionario</h1>
          <p className="text-muted-foreground">Completa el formulario de interés del proyecto Souto Vivo</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center ${
                  currentStep === step.id
                    ? "text-primary"
                    : currentStep > step.id
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                }`}
                data-testid={`step-${step.id}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/50 text-muted-foreground/50"
                }`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs hidden sm:block">{step.name}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-1 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, "enviado"))}>
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>1. Datos de la Persona Interesada</CardTitle>
                <CardDescription>Información de contacto y perfil del solicitante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombreApellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre y apellidos *</FormLabel>
                      <FormControl>
                        <Input data-testid="input-nombre" placeholder="Nombre completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono de contacto</FormLabel>
                        <FormControl>
                          <Input data-testid="input-telefono" placeholder="Teléfono" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input data-testid="input-email" type="email" placeholder="email@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="localidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localidad</FormLabel>
                      <FormControl>
                        <Input data-testid="input-localidad" placeholder="Municipio o localidad" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="genero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Género</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="mujer" id="genero-mujer" data-testid="radio-genero-mujer" />
                              <label htmlFor="genero-mujer">Mujer</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hombre" id="genero-hombre" data-testid="radio-genero-hombre" />
                              <label htmlFor="genero-hombre">Hombre</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="otros" id="genero-otros" data-testid="radio-genero-otros" />
                              <label htmlFor="genero-otros">Otros</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="edad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="menos_35" id="edad-menos35" data-testid="radio-edad-menos35" />
                              <label htmlFor="edad-menos35">&lt;35</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="entre_35_50" id="edad-35-50" data-testid="radio-edad-35-50" />
                              <label htmlFor="edad-35-50">35-50</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="mas_50" id="edad-mas50" data-testid="radio-edad-mas50" />
                              <label htmlFor="edad-mas50">&gt;50</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="relacionFinca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relación con la finca</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="propietario" id="rel-prop" data-testid="radio-relacion-propietario" />
                            <label htmlFor="rel-prop">Propietario/a</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="arrendatario" id="rel-arr" data-testid="radio-relacion-arrendatario" />
                            <label htmlFor="rel-arr">Arrendatario/a</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gestor" id="rel-gest" data-testid="radio-relacion-gestor" />
                            <label htmlFor="rel-gest">Gestor/a</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="otra" id="rel-otra" data-testid="radio-relacion-otra" />
                            <label htmlFor="rel-otra">Otra</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("relacionFinca") === "otra" && (
                  <FormField
                    control={form.control}
                    name="relacionFincaOtra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especificar otra relación</FormLabel>
                        <FormControl>
                          <Input data-testid="input-relacion-otra" placeholder="Especificar..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("relacionFinca") === "propietario" && (
                  <FormField
                    control={form.control}
                    name="titularidadCompartida"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿La finca está bajo régimen de Titularidad Compartida?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="si" id="tit-si" data-testid="radio-titularidad-si" />
                              <label htmlFor="tit-si">Sí</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="tit-no" data-testid="radio-titularidad-no" />
                              <label htmlFor="tit-no">No</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="agricultorTituloPrincipal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Es usted agricultor/a a título principal?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si" id="agr-si" data-testid="radio-agricultor-si" />
                            <label htmlFor="agr-si">Sí</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no_complementario" id="agr-no" data-testid="radio-agricultor-no" />
                            <label htmlFor="agr-no">No, es complementario</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="asociacionPertenece"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Pertenece a alguna asociación?</FormLabel>
                      <FormControl>
                        <Input data-testid="input-asociacion" placeholder="Indique cuál (si procede)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>2. Información Básica de la Finca</CardTitle>
                <CardDescription>Datos catastrales y características de la finca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="referenciasCatastrales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referencias catastrales o polígono y parcela</FormLabel>
                      <FormDescription>Esta información figura en los recibos del IBI y en la web del Catastro</FormDescription>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-referencias" 
                          placeholder="Introduzca las referencias catastrales..." 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="superficieCategoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superficie aproximada disponible</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="menos_1ha" id="sup-1" data-testid="radio-superficie-menos1" />
                            <label htmlFor="sup-1">Menos de 1 ha</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="entre_1_5ha" id="sup-1-5" data-testid="radio-superficie-1-5" />
                            <label htmlFor="sup-1-5">Entre 1 y 5 ha</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mas_5ha" id="sup-5" data-testid="radio-superficie-mas5" />
                            <label htmlFor="sup-5">Más de 5 ha</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="otra" id="sup-otra" data-testid="radio-superficie-otra" />
                            <label htmlFor="sup-otra">Otra</label>
                          </div>
                          <div className="flex items-center space-x-2 col-span-2">
                            <RadioGroupItem value="no_se" id="sup-nose" data-testid="radio-superficie-nose" />
                            <label htmlFor="sup-nose">No lo sé / pendiente de consultar</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("superficieCategoria") === "otra" && (
                  <FormField
                    control={form.control}
                    name="superficieOtra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especificar superficie</FormLabel>
                        <FormControl>
                          <Input data-testid="input-superficie-otra" placeholder="Especificar..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="tipoFinca"
                  render={() => (
                    <FormItem>
                      <FormLabel>Tipo de finca (puede marcar varias)</FormLabel>
                      <CheckboxArrayField
                        name="tipoFinca"
                        options={[
                          { value: "agricola", label: "Agrícola" },
                          { value: "forestal", label: "Forestal" },
                          { value: "mixta", label: "Mixta" },
                        ]}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usoSuelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uso actual del suelo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cultivo_activo" id="uso-cult" data-testid="radio-uso-cultivo" />
                            <label htmlFor="uso-cult">Cultivo activo</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pasto" id="uso-past" data-testid="radio-uso-pasto" />
                            <label htmlFor="uso-past">Pasto</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="monte" id="uso-mont" data-testid="radio-uso-monte" />
                            <label htmlFor="uso-mont">Monte</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sin_uso" id="uso-sin" data-testid="radio-uso-sin" />
                            <label htmlFor="uso-sin">Sin uso / abandonado</label>
                          </div>
                          <div className="flex items-center space-x-2 col-span-2">
                            <RadioGroupItem value="otro" id="uso-otro" data-testid="radio-uso-otro" />
                            <label htmlFor="uso-otro">Otro</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("usoSuelo") === "otro" && (
                  <FormField
                    control={form.control}
                    name="usoSueloOtro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especificar uso</FormLabel>
                        <FormControl>
                          <Input data-testid="input-uso-otro" placeholder="Especificar..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="enProduccion"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-produccion"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">¿La finca está actualmente en producción?</FormLabel>
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Condiciones de la finca</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="acceso"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acceso a la finca</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="bueno" id="acc-bueno" data-testid="radio-acceso-bueno" />
                                <label htmlFor="acc-bueno">Bueno (con vehículo)</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="regular" id="acc-reg" data-testid="radio-acceso-regular" />
                                <label htmlFor="acc-reg">Regular</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="malo" id="acc-malo" data-testid="radio-acceso-malo" />
                                <label htmlFor="acc-malo">Malo</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="agua"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Disponibilidad de agua</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="si" id="agua-si" data-testid="radio-agua-si" />
                                <label htmlFor="agua-si">Sí</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="agua-no" data-testid="radio-agua-no" />
                                <label htmlFor="agua-no">No</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no_se" id="agua-nose" data-testid="radio-agua-nose" />
                                <label htmlFor="agua-nose">No lo sé</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pendiente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pendiente del terreno</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="baja" id="pend-baja" data-testid="radio-pendiente-baja" />
                                <label htmlFor="pend-baja">Baja</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="media" id="pend-media" data-testid="radio-pendiente-media" />
                                <label htmlFor="pend-media">Media</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="alta" id="pend-alta" data-testid="radio-pendiente-alta" />
                                <label htmlFor="pend-alta">Alta</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pedregosidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pedregosidad</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="baja" id="pedr-baja" data-testid="radio-pedreg-baja" />
                                <label htmlFor="pedr-baja">Baja</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="media" id="pedr-media" data-testid="radio-pedreg-media" />
                                <label htmlFor="pedr-media">Media</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="alta" id="pedr-alta" data-testid="radio-pedreg-alta" />
                                <label htmlFor="pedr-alta">Alta</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>4. Necesidades y Objetivos de la Finca</CardTitle>
                <CardDescription>Identifica las necesidades y el modelo agroforestal deseado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="necesidades"
                  render={() => (
                    <FormItem>
                      <FormLabel>Principales necesidades de la finca (puede marcar varias)</FormLabel>
                      <CheckboxArrayField
                        name="necesidades"
                        options={[
                          { value: "mejora_productividad", label: "Mejora de la productividad" },
                          { value: "control_matorral", label: "Control del matorral" },
                          { value: "prevencion_incendios", label: "Prevención de incendios" },
                          { value: "mejora_suelo", label: "Mejora del suelo" },
                          { value: "diversificacion_usos", label: "Diversificación de usos" },
                          { value: "puesta_valor_abandonada", label: "Puesta en valor de finca abandonada" },
                        ]}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="necesidadesOtras"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otras necesidades</FormLabel>
                      <FormControl>
                        <Input data-testid="input-necesidades-otras" placeholder="Especificar..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objetivosModelo"
                  render={() => (
                    <FormItem>
                      <FormLabel>¿Qué modelo agroforestal le gustaría conseguir?</FormLabel>
                      <CheckboxArrayField
                        name="objetivosModelo"
                        options={[
                          { value: "produccion", label: "Producción" },
                          { value: "conservacion", label: "Conservación del paisaje y biodiversidad" },
                          { value: "reduccion_costes", label: "Reducción de costes de mantenimiento" },
                          { value: "impacto_social", label: "Nuevos modelos de impacto social" },
                        ]}
                      />
                    </FormItem>
                  )}
                />

                {form.watch("objetivosModelo")?.includes("produccion") && (
                  <FormField
                    control={form.control}
                    name="produccionPrincipal"
                    render={() => (
                      <FormItem>
                        <FormLabel>Tipo de producción principal</FormLabel>
                        <CheckboxArrayField
                          name="produccionPrincipal"
                          options={[
                            { value: "madera", label: "Madera" },
                            { value: "lena", label: "Leña" },
                            { value: "castana", label: "Castaña" },
                            { value: "vid", label: "Vid" },
                            { value: "fruticola", label: "Frutícola (cereza, pera, manzana)" },
                            { value: "horticola", label: "Hortícola (pimiento, cebolla)" },
                            { value: "pasto_ganadera", label: "Pasto / ganadera" },
                            { value: "apicolas", label: "Productos apícolas (miel, polen, propóleo)" },
                          ]}
                        />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="otrosObjetivosTexto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otros objetivos</FormLabel>
                      <FormControl>
                        <Input data-testid="input-otros-objetivos" placeholder="Especificar..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>5. Interés y Compromiso</CardTitle>
                <CardDescription>Nivel de participación e interés en el proyecto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="gradoInteres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grado de interés en participar en un proyecto piloto</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="alto" id="int-alto" data-testid="radio-interes-alto" />
                            <label htmlFor="int-alto">Alto</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medio" id="int-medio" data-testid="radio-interes-medio" />
                            <label htmlFor="int-medio">Medio</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bajo" id="int-bajo" data-testid="radio-interes-bajo" />
                            <label htmlFor="int-bajo">Bajo</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nivelActuacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿En qué nivel estaría dispuesto/a que actúe el proyecto?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="solo_diagnostico" id="niv-diag" data-testid="radio-nivel-diagnostico" />
                            <label htmlFor="niv-diag">Solo diagnóstico y propuesta técnica</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="implantacion" id="niv-impl" data-testid="radio-nivel-implantacion" />
                            <label htmlFor="niv-impl">Implantación de actuaciones piloto</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="disponibilidad"
                  render={() => (
                    <FormItem>
                      <FormLabel>Disponibilidad para (marcar lo que proceda)</FormLabel>
                      <CheckboxArrayField
                        name="disponibilidad"
                        options={[
                          { value: "reuniones_talleres", label: "Asistir a reuniones o talleres" },
                          { value: "visitas_tecnicas", label: "Recibir visitas técnicas en la finca" },
                          { value: "seguimiento", label: "Colaborar en el seguimiento del proyecto" },
                        ]}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relevoGeneracional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Existe previsión de relevo generacional en los próximos 5-10 años?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_familiares" id="rel-si" data-testid="radio-relevo-si" />
                            <label htmlFor="rel-si">Sí, hay familiares o personas interesadas</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no_riesgo_abandono" id="rel-no" data-testid="radio-relevo-no" />
                            <label htmlFor="rel-no">No, existe riesgo de abandono tras mi jubilación</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="buscando" id="rel-busc" data-testid="radio-relevo-buscando" />
                            <label htmlFor="rel-busc">Estoy buscando a alguien que quiera trabajarla</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>6. Necesidades Formativas</CardTitle>
                <CardDescription>Formación que le gustaría recibir</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="formacion"
                  render={() => (
                    <FormItem>
                      <FormLabel>¿En qué aspectos le gustaría recibir formación?</FormLabel>
                      <CheckboxArrayField
                        name="formacion"
                        options={[
                          { value: "cultivo_castano", label: "Cultivo del castaño" },
                          { value: "sistemas_agroforestales", label: "Sistemas agroforestales" },
                          { value: "agricultura_regenerativa", label: "Agricultura regenerativa" },
                          { value: "ganaderia_regenerativa", label: "Ganadería regenerativa" },
                          { value: "plantaciones_carbono", label: "Plantaciones de fijación de carbono" },
                          { value: "comercializacion", label: "Comercialización de productos" },
                          { value: "tramitacion_ayudas", label: "Tramitación de ayudas" },
                          { value: "legislacion_fiscalidad", label: "Legislación y fiscalidad" },
                        ]}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formacionOtro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otra formación</FormLabel>
                      <FormControl>
                        <Input data-testid="input-formacion-otro" placeholder="Especificar..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>7. Dimensión Social y Gestión Colectiva</CardTitle>
                <CardDescription>Modelos de colaboración y gestión comunitaria</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="colaboracion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Estaría dispuesto/a a participar en gestión conjunta?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_agrupacion" id="col-agr" data-testid="radio-colaboracion-agrupacion" />
                            <label htmlFor="col-agr">Sí, me interesa integrarme en una agrupación</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_puntuales" id="col-punt" data-testid="radio-colaboracion-puntuales" />
                            <label htmlFor="col-punt">Sí, pero solo para acciones puntuales</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no_individual" id="col-ind" data-testid="radio-colaboracion-individual" />
                            <label htmlFor="col-ind">No, prefiero gestión individual</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no_se_asesoria" id="col-nose" data-testid="radio-colaboracion-nose" />
                            <label htmlFor="col-nose">No lo sé, necesitaría asesoramiento</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minifundio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Considera que el tamaño/dispersión de sus fincas es un obstáculo?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_mucho" id="min-mucho" data-testid="radio-minifundio-mucho" />
                            <label htmlFor="min-mucho">Sí, mucho</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_asumible" id="min-asum" data-testid="radio-minifundio-asumible" />
                            <label htmlFor="min-asum">Sí, aunque es asumible</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no_adecuado" id="min-adec" data-testid="radio-minifundio-adecuado" />
                            <label htmlFor="min-adec">No, el tamaño es adecuado</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cesionTierras"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Cedería la gestión mediante Banco de Tierras si no puede trabajarla?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_contrato" id="ces-cont" data-testid="radio-cesion-contrato" />
                            <label htmlFor="ces-cont">Sí, bajo contrato de arrendamiento o cesión</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="si_municipio" id="ces-mun" data-testid="radio-cesion-municipio" />
                            <label htmlFor="ces-mun">Sí, pero solo a alguien del municipio</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="ces-no" data-testid="radio-cesion-no" />
                            <label htmlFor="ces-no">No, no tengo interés en ceder la gestión</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gobernanzaComunidad"
                  render={() => (
                    <FormItem>
                      <FormLabel>¿Cómo cree que el proyecto podría mejorar la comunidad?</FormLabel>
                      <CheckboxArrayField
                        name="gobernanzaComunidad"
                        options={[
                          { value: "empleo_local", label: "Creación de empleo local" },
                          { value: "recuperar_tierras", label: "Recuperar tierras abandonadas" },
                          { value: "formacion_capacitacion", label: "Formación y capacitación" },
                          { value: "cooperativas_colectivas", label: "Cooperativas y gestión colectiva" },
                          { value: "turismo_rural", label: "Turismo rural" },
                        ]}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gobernanzaOtro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otras sugerencias de gobernanza</FormLabel>
                      <FormControl>
                        <Input data-testid="input-gobernanza-otro" placeholder="Especificar..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observaciones"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observaciones finales</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="textarea-observaciones" 
                          placeholder="Cualquier comentario adicional..." 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4 space-y-4">
                  <h4 className="font-medium">Consentimiento RGPD</h4>
                  
                  <FormField
                    control={form.control}
                    name="consentimientoTratamiento"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-consentimiento"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Acepto el tratamiento de mis datos personales *
                          </FormLabel>
                          <FormDescription>
                            Sus datos serán tratados conforme al RGPD para la gestión del proyecto Souto Vivo
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aceptoComunicaciones"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-comunicaciones"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Acepto recibir comunicaciones sobre el proyecto
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {currentStep === steps.length ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const data = form.getValues();
                      onSubmit(data as FormData, "borrador");
                    }}
                    disabled={submitMutation.isPending}
                    data-testid="button-save-draft"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar borrador
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
                        Enviando...
                      </span>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar cuestionario
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={nextStep} data-testid="button-next-step">
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
