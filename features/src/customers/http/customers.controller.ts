import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { CurrentStore, Public, RequirePermission, type ActiveStore } from '@mitama/contracts';
import { RegisterCustomerUseCase } from '../application/register-customer/register-customer.use-case';
import { CreateGuestCustomerUseCase } from '../application/create-guest-customer/create-guest-customer.use-case';
import { GetCustomerUseCase } from '../application/get-customer/get-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers/list-customers.use-case';
import { ManageCustomerAddressUseCase } from '../application/manage-customer-address/manage-customer-address.use-case';
import { CustomerAddressNotFoundError, CustomerNotFoundError } from '../domain/errors';
import type { CustomerOutput } from '../application/customer.dto';

class RegisterCustomerRequestDto {
  @IsString()
  storeId!: string;

  @IsEmail({}, { message: 'El email no es válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string | null;
}

class GuestCustomerRequestDto {
  @IsString()
  storeId!: string;

  @IsEmail({}, { message: 'El email no es válido' })
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string | null;
}

class AddressRequestDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string | null;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  province?: string | null;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsString()
  countryCode!: string;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;
}

class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

@ApiTags('customers')
@Controller('customers')
@RequirePermission('customers.read')
export class CustomersController {
  constructor(
    private readonly registerCustomer: RegisterCustomerUseCase,
    private readonly createGuestCustomer: CreateGuestCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly listCustomers: ListCustomersUseCase,
    private readonly manageAddress: ManageCustomerAddressUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado de compradores de la tienda activa' })
  async list(@Query() query: ListCustomersQueryDto, @CurrentStore() store?: ActiveStore) {
    const result = await this.listCustomers.execute({ ...query, storeId: store?.id });
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudieron listar los compradores');
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registra un comprador con email y contraseña' })
  @ApiOkResponse({ description: 'Comprador registrado' })
  async register(@Body() body: RegisterCustomerRequestDto): Promise<CustomerOutput> {
    const result = await this.registerCustomer.execute(body);
    if (result.isErr()) throw new ConflictException(result.error.message);
    return result.value;
  }

  @Post('guests')
  @Public()
  @ApiOperation({ summary: 'Crea o reutiliza un comprador invitado' })
  async createGuest(@Body() body: GuestCustomerRequestDto): Promise<CustomerOutput> {
    const result = await this.createGuestCustomer.execute(body);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudo crear el invitado');
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Obtiene el perfil de un comprador' })
  async get(@Param('customerId') customerId: string): Promise<CustomerOutput> {
    const result = await this.getCustomer.execute(customerId);
    if (result.isErr()) throw new NotFoundException(result.error.message);
    return result.value;
  }

  @Post(':customerId/addresses')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Agrega una dirección al comprador' })
  async addAddress(@Param('customerId') customerId: string, @Body() body: AddressRequestDto): Promise<CustomerOutput> {
    return this.unwrapAddressResult(await this.manageAddress.execute({ action: 'add', customerId, ...body }));
  }

  @Patch(':customerId/addresses/:addressId')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Actualiza una dirección del comprador' })
  async updateAddress(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() body: Partial<AddressRequestDto>,
  ): Promise<CustomerOutput> {
    return this.unwrapAddressResult(await this.manageAddress.execute({ action: 'update', customerId, addressId, ...body }));
  }

  @Delete(':customerId/addresses/:addressId')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Elimina una dirección del comprador' })
  async removeAddress(@Param('customerId') customerId: string, @Param('addressId') addressId: string): Promise<CustomerOutput> {
    return this.unwrapAddressResult(await this.manageAddress.execute({ action: 'remove', customerId, addressId }));
  }

  private unwrapAddressResult(result: Awaited<ReturnType<ManageCustomerAddressUseCase['execute']>>): CustomerOutput {
    if (result.isOk()) return result.value;
    if (result.error instanceof CustomerNotFoundError || result.error instanceof CustomerAddressNotFoundError) {
      throw new NotFoundException(result.error.message);
    }
    throw new BadRequestException('No se pudo actualizar la dirección');
  }
}
