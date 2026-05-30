/**
 * Aurora DI Decorators
 *
 * Class and parameter decorators for dependency injection.
 */

export { Injectable } from './injectable.decorator';
export { Inject, MultiInject, Optional, getPropertyInjections } from './inject.decorator';
export type { PropertyInjectionEntry } from './inject.decorator';
export { Module, getModuleMetadata, isModule } from './module.decorator';
