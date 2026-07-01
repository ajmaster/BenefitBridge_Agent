# Source ID Index

Runtime source metadata is stored in `app/data/source_pack/approved_sources.json`.
Use source IDs, not copied prose, when building packets.

Core official or official-adjacent sources:

- `benefitscal_info` and `benefitscal_login`: California benefits portal
  information and final link-out destination.
- `cdss_calfresh_home` and `usda_snap_california_directory`: CalFresh/SNAP
  program grounding.
- `cdph_wic_home`, `cdph_wic_am_i_eligible`, and
  `cdph_wic_office_grocer_locator`: WIC grounding and office locator handoff.
- `dhcs_medi_cal_apply`, `dhcs_county_offices`, and `covered_ca_get_started`:
  health coverage grounding.
- `csd_liheap_program`, `caliheapapply_home`, `california_lifeline`, and
  `cpuc_lifeline_eligibility`: utility and phone assistance grounding.
- `scc_apply_public_benefits`, `scc_calfresh_page`, `scc_general_assistance`,
  and `scc_wic_apply`: Santa Clara County benefit handoffs.
- `sfhsa_home`, `sfhsa_calfresh_apply`, `sfhsa_medi_cal`, and
  `sfhsa_calworks_apply`: San Francisco HSA handoffs.
- `sanjose_homeless_services_guide`, `scc_osh_temporary_emergency_shelter`,
  `sf_hsh_department`, `sf_coordinated_entry`, and
  `sfserviceguide_adult_shelter_reservation`: housing and shelter routing.
- `ca_211_home`, `scc_211_bayarea`, and `sf_211_bayarea_housing`: 211 routing.
- `hud_housing_counselor_api`, `healthcare_gov_developers_content_api`, and
  DataSF/Socrata entries: public API smoke or refresh helpers.

Before adding a source:

- Add metadata to the raw source pack first.
- Add or refresh the runtime fixture copy under `app/data/source_pack/`.
- Add the domain to `approved_domains.txt`.
- Update program-area and county references by source ID.
- Run `python scripts/validate_source_pack.py`.

