from app.db.session import Base, SessionLocal, engine, get_db


def test_db_engine_and_base():
    assert engine is not None
    assert Base is not None
    assert SessionLocal is not None


def test_get_db_generator():
    db_gen = get_db()
    db = next(db_gen)
    assert db is not None
    try:
        # Check session is active
        assert db.is_active is True
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
