class SingletonMeta(type):
    """
    Singleton Pattern: a metaclass that ensures only one instance
    of any class using it can ever be created.

    Usage:
        class MyClass(metaclass=SingletonMeta):
            ...
    """
    _instances: dict = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]