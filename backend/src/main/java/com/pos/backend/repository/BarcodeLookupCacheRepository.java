package com.pos.backend.repository;

import com.pos.backend.model.BarcodeLookupCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BarcodeLookupCacheRepository extends JpaRepository<BarcodeLookupCache, String> {

    @Query("SELECT c FROM BarcodeLookupCache c WHERE c.barcode = :barcode AND c.expiresAt > :now")
    Optional<BarcodeLookupCache> findValidByBarcode(@Param("barcode") String barcode, @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM BarcodeLookupCache c WHERE c.expiresAt <= :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
